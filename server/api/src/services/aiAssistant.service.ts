/**
 * aiAssistant.service.ts
 *
 * צ'אט עוזר AI: עונה על שאלות כלליות (סופרים, מחירים, טיפים לקנייה חכמה)
 * וגם נותן המלצות מבוססות-נתונים על סמך התובנות/ההוצאות האמיתיות של המשתמש.
 * מבוסס על Groq כספק ראשי - endpoint תואם OpenAI (console.groq.com), טייר
 * חינמי עם חומרת LPU ייעודית שמריצה מודלים כמו Llama 3.3 70B מהר משמעותית
 * מ-GPU רגיל. NVIDIA NIM משמש כספק גיבוי אוטומטי: אם Groq נכשל (מכסה
 * חינמית נגמרה, שגיאת שרת, timeout) עוברים אליו בלי שהמשתמש ירגיש. שני
 * המפתחות הם סוד אמיתי - נשמרים רק כמשתני סביבה בשרת, אף פעם לא נשלחים ללקוח.
 *
 * קובץ מבודד בכוונה: הוספת/החלפת ספק היא שינוי מקומי כאן בלבד (רשימת
 * PROVIDERS) - שום קוד אחר לא תלוי בספק ספציפי.
 */

import { logger } from '../config';
import { env } from '../config/environment';
import { AppError } from '../errors';
import { getUserInsights } from './insights.service';
import { ListDAL } from '../dal/list.dal';
import { Product } from '../models';

interface AiProvider {
  name: string;
  url: string;
  apiKey: string;
  model: string;
}

// מודלים שלא מתאימים לטקסט — מסוננים אוטומטית
const MODEL_BLOCKLIST = ['whisper', 'guard', 'tts', 'embed', 'vision', 'audio', 'speech'];

// מחרוזות שמעידות על מודל גדול — משמשות לדירוג
const SIZE_HINTS = ['405b', '70b', '120b', '72b', '65b', '34b', '27b', '32b', '20b', '13b', '8b', '7b'];

function scoreModel(id: string): number {
  const lower = id.toLowerCase();
  if (MODEL_BLOCKLIST.some(b => lower.includes(b))) return -1;
  const sizeIdx = SIZE_HINTS.findIndex(s => lower.includes(s));
  // מודל גדול יותר = ציון גבוה יותר (SIZE_HINTS ממויין מגדול לקטן)
  return sizeIdx === -1 ? 0 : SIZE_HINTS.length - sizeIdx;
}

let cachedGroqModel: string | null = null;
let groqModelCachedAt = 0;
const GROQ_MODEL_CACHE_TTL = 60 * 60 * 1000;

async function resolveGroqModel(apiKey: string): Promise<string> {
  const now = Date.now();
  if (cachedGroqModel && now - groqModelCachedAt < GROQ_MODEL_CACHE_TTL) return cachedGroqModel;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as { data: { id: string }[] };
      const best = data.data
        .map(m => ({ id: m.id, score: scoreModel(m.id) }))
        .filter(m => m.score >= 0)
        .sort((a, b) => b.score - a.score)[0];
      if (best) {
        cachedGroqModel = best.id;
        groqModelCachedAt = now;
        logger.info('Groq auto-selected model: %s (score %d)', best.id, best.score);
        return cachedGroqModel;
      }
    }
  } catch (e) {
    logger.warn('Groq model discovery failed: %s', (e as Error).message);
  }
  cachedGroqModel = env.GROQ_MODEL;
  groqModelCachedAt = now;
  return cachedGroqModel;
}

/** נקרא בעת עליית השרת — ממלא את cache המודל ורענן אותו ברקע לעד */
export function warmGroqModel(): void {
  if (!env.GROQ_API_KEY) return;
  resolveGroqModel(env.GROQ_API_KEY).catch(() => {});
  // מרענן לפני שה-cache פג — המשתמש תמיד מקבל תשובה ממה שכבר בcache
  setInterval(() => resolveGroqModel(env.GROQ_API_KEY!).catch(() => {}), 60 * 60 * 1000);
}

// ===== מעקב סטטוס לפאנל "פרטי AI" באדמין =====
// לא persistent (זיכרון תהליך יחיד) - מספיק כדי להראות למנהל תמונת מצב
// חיה: כמה בקשות בוצעו, מתי הספק הצליח/נכשל לאחרונה, ומה מכסת ה-rate-limit
// שהספק עצמו מחזיר ב-headers (לא ניחוש שלנו - הנתון האמיתי מהספק).
export interface AiProviderRateLimit {
  limitRequests: string | null;
  remainingRequests: string | null;
  resetRequests: string | null;
  limitTokens: string | null;
  remainingTokens: string | null;
  resetTokens: string | null;
}
interface ProviderStats {
  requestCount: number;
  lastSuccessAt: number | null;
  lastError: string | null;
  lastErrorReason: string | null;
  lastErrorAt: number | null;
  rateLimit: AiProviderRateLimit | null;
}
const providerStats = new Map<string, ProviderStats>();
const serverStartedAt = Date.now();
let fallbackCount = 0;

// ===== תקציב יומי גלובלי לקריאות AI חיצוניות =====
// המכסה החינמית של Groq/NIM היא לכל האפליקציה, לא פר-משתמש. aiAssistantLimiter
// חוסם 20/משתמש/שעה אבל לא את הסכום - מספיק ~30 משתמשים פעילים כדי לרוקן את
// המכסה היומית ואז כולם נופלים לגיבוי (וגם הוא נשרף). כשמגיעים לתקציב ה-route
// מחזיר 429 עם resetAt (חצות UTC הבא) כך שהלקוח מציג "חוזר בעוד X שעות".
// state ברמת המודול - עקבי עם providerStats/fallbackCount (תהליך יחיד).
const AI_DAILY_BUDGET = env.AI_DAILY_REQUEST_BUDGET;
let aiDayKey = '';
let aiRequestsToday = 0;

function rolloverAiDay(): void {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  if (today !== aiDayKey) {
    aiDayKey = today;
    aiRequestsToday = 0;
  }
}
function aiBudgetExceeded(): boolean {
  if (AI_DAILY_BUDGET <= 0) return false; // 0 = בלי תקרה
  rolloverAiDay();
  return aiRequestsToday >= AI_DAILY_BUDGET;
}
function recordAiRequest(): void {
  rolloverAiDay();
  aiRequestsToday++;
}

// חצות UTC הבא - הרגע שבו המונה היומי מתאפס.
function nextDailyResetIso(): string {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0,
  )).toISOString();
}

export interface AiDailyBudgetStatus {
  limit: number;        // 0 = ללא הגבלה
  usedToday: number;
  exceeded: boolean;
  resetAt: string | null; // null כשאין הגבלה
}

/** מצב התקציב היומי - ל-route guard וגם לפאנל האדמין. */
export function getAiDailyBudget(): AiDailyBudgetStatus {
  rolloverAiDay();
  return {
    limit: AI_DAILY_BUDGET,
    usedToday: aiRequestsToday,
    exceeded: aiBudgetExceeded(),
    resetAt: AI_DAILY_BUDGET > 0 ? nextDailyResetIso() : null,
  };
}

function getProviderStats(name: string): ProviderStats {
  let s = providerStats.get(name);
  if (!s) {
    s = { requestCount: 0, lastSuccessAt: null, lastError: null, lastErrorReason: null, lastErrorAt: null, rateLimit: null };
    providerStats.set(name, s);
  }
  return s;
}

// הודעת שגיאה גולמית (status code / stack טכני) לא אומרת כלום למנהל -
// זה מתרגם אותה להסבר קריא בעברית: למה זה כנראה קרה בפועל, לא רק "429".
// ה-raw נשמר בנפרד (מקוצר) לצורך דיבוג אמיתי מי שצריך את הפרטים הטכניים.
function classifyError(status: number | null, rawMessage: string): string {
  if (status === 401 || status === 403) return 'מפתח ה-API נדחה על ידי הספק - כנראה לא תקין או פג תוקף';
  if (status === 429) return 'המכסה של הספק נגמרה כרגע (Rate Limit) - יחזור לפעול לבד כשהמכסה מתאפסת';
  if (status && status >= 500) return `שגיאת שרת אצל הספק (קוד ${status}) - כנראה תקלה זמנית בצד שלהם, לא קשורה אלינו`;
  if (status && status >= 400) return `הבקשה נדחתה על ידי הספק (קוד ${status})`;
  const lower = rawMessage.toLowerCase();
  if (lower.includes('abort') || lower.includes('timeout')) return 'הספק לא הגיב תוך 30 שניות (timeout) - כנראה עומס זמני אצלו';
  if (lower.includes('empty response')) return 'הספק החזיר תשובה ריקה ללא תוכן';
  if (lower.includes('fetch failed') || lower.includes('network') || lower.includes('enotfound') || lower.includes('econnrefused')) {
    return 'בעיית רשת - השרת שלנו לא הצליח בכלל להגיע לספק';
  }
  return 'שגיאה לא מזוהה - ראה פרטים טכניים למטה';
}

const RAW_ERROR_MAX_LEN = 300;
function truncateRaw(msg: string): string {
  return msg.length > RAW_ERROR_MAX_LEN ? `${msg.slice(0, RAW_ERROR_MAX_LEN)}…` : msg;
}

// מודלי "reasoning" (כמו gpt-oss, שנבחר אוטומטית ע"י resolveGroqModel כי
// הוא הכי גדול) חושבים "בשקט" לפני שהם פולטים תוכן גלוי - אם כל תקציב
// ה-max_tokens נאכל על חשיבה פנימית, יכולים לחזור עם תשובה ריקה לגמרי
// (בלי אף delta) או חתוכה, בלי שום שגיאה שמסבירה למה. reasoning_effort:
// 'low' (נתמך ב-Groq למשפחת gpt-oss) שומר את רוב התקציב לתשובה בפועל -
// קריטי לצ'אט/ניתוח שצריך תשובה קצרה וגלויה, לא חשיבה ארוכה מאחורי הקלעים.
function isReasoningModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes('gpt-oss') || lower.includes('deepseek') || lower.includes('qwq');
}

// headers סטנדרטיים תואמי-OpenAI ל-rate limit (Groq תומך בהם; NIM לרוב לא -
// אז מחזיר null וזה בסדר, ה-UI מציג "אין נתונים" במקום להמציא ערך)
function readRateLimit(headers: Headers): AiProviderRateLimit | null {
  const limitRequests = headers.get('x-ratelimit-limit-requests');
  const limitTokens = headers.get('x-ratelimit-limit-tokens');
  if (!limitRequests && !limitTokens) return null;
  return {
    limitRequests,
    remainingRequests: headers.get('x-ratelimit-remaining-requests'),
    resetRequests: headers.get('x-ratelimit-reset-requests'),
    limitTokens,
    remainingTokens: headers.get('x-ratelimit-remaining-tokens'),
    resetTokens: headers.get('x-ratelimit-reset-tokens'),
  };
}

// סדר הניסיון: Groq ראשון (מהיר יותר), NIM כגיבוי.
async function getProviders(): Promise<AiProvider[]> {
  const list: AiProvider[] = [];
  if (env.GROQ_API_KEY) {
    const model = await resolveGroqModel(env.GROQ_API_KEY);
    list.push({ name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', apiKey: env.GROQ_API_KEY, model });
  }
  if (env.NVIDIA_NIM_API_KEY) {
    list.push({ name: 'NVIDIA NIM', url: 'https://integrate.api.nvidia.com/v1/chat/completions', apiKey: env.NVIDIA_NIM_API_KEY, model: env.NVIDIA_NIM_MODEL });
  }
  return list;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// מגבלות על גודל הקלט - מונע ניצול לרעה של המכסה (הודעה ענקית/היסטוריה
// אינסופית) ושומר על עלות/latency סבירים. 1000 היה נמוך מדי בפועל: הפרומפט
// האוטומטי של "ניתוח רשימה" (ListAnalysisDrawer.buildAnalysisPrompt) מכיל
// טקסט הנחיות קבוע (~750 תווים) שכבר לבדו קרוב לתקרה, ועם רשימה של 15-20+
// מוצרים חורג ממנה בקלות - נכשל ב-400 "Message too long" בלי שום אינדיקציה
// למשתמש למה, בדיוק על רשימות גדולות יותר בעוד רשימות קטנות עובדות תקין.
const MAX_MESSAGE_LENGTH = 2500;
const MAX_HISTORY_MESSAGES = 20;

// getUserInsights מריץ אגרגציה כבדה (כל המוצרים של המשתמש + group stats +
// spending) - יקר מדי להריץ מחדש על כל הודעה בודדת בשיחה. cache קצר בזיכרון
// (לא Redis - תהליך יחיד, TTL קצר מספיק) מוריד את זה לפעם אחת לכמה דקות
// במקום לכל הודעה, בלי לפגוע משמעותית בטריות הנתונים לצורך שיחת צ'אט.
const CONTEXT_CACHE_TTL_MS = 3 * 60 * 1000;
const contextCache = new Map<string, { context: string; expiresAt: number }>();

function isConfigured(): boolean {
  return !!(env.GROQ_API_KEY || env.NVIDIA_NIM_API_KEY);
}

// נקראת מ-controllers שמשנים מוצרים/רשימות (הוספה, מחיקה, סימון קנייה,
// ניקוי) - כדי שהעוזר לא ימשיך לענות עד 3 דקות לפי context ישן. בלי זה,
// משתמש שמוסיף/משנה פריט ומיד שואל את ה-AI עליו מקבל תשובה שלא רואה את
// השינוי, כי contextCache מפתחו userId בלבד ולא היה לו hook ביטול משלו
// (בניגוד ל-insightsMemCache שכבר יש לו invalidateInsightsCache).
export function invalidateAssistantContext(userId: string): void {
  contextCache.delete(userId);
}

interface ListWithProducts {
  name: string;
  icon?: string;
  items: { name: string; quantity: number; unit: string; isPurchased: boolean }[];
}

// תמצות תובנות המשתמש לטקסט קצר וקריא ל-LLM - לא שולחים את כל אובייקט
// ה-InsightsData הגולמי (ענק, ברובו לא רלוונטי לשיחה, מכביד על ה-context).
function buildUserContext(insights: Awaited<ReturnType<typeof getUserInsights>>, lists: ListWithProducts[]): string {
  const {
    stats, topProducts, categoryBreakdown, spending, shoppingFrequency, forgotten, upcomingNeeds,
    shoppingScore, shoppingPersonality, streaks, monthComparison, anomalies, groupStats,
  } = insights;

  const lines: string[] = [];

  // תוכן הרשימות הנוכחי — מה יש ממש ברשימה עכשיו
  if (lists.length > 0) {
    lines.push('תוכן הרשימות הנוכחי:');
    for (const list of lists) {
      const title = `${list.icon || ''} ${list.name}`.trim();
      if (list.items.length === 0) {
        lines.push(`  📋 "${title}": ריקה`);
      } else {
        const itemLines = list.items.map(i => {
          const qty = i.quantity !== 1 ? ` x${i.quantity} ${i.unit}` : '';
          return `    ${i.isPurchased ? '✅' : '⬜'} ${i.name}${qty}`;
        });
        lines.push(`  📋 "${title}":`);
        lines.push(...itemLines);
      }
    }
  }

  if (stats.totalProducts === 0) {
    lines.push('אין עדיין נתוני קנייה היסטוריים (משתמש חדש או רשימות ריקות).');
    return lines.join('\n');
  }
  lines.push(`סה"כ ${stats.totalProducts} מוצרים ב-${stats.totalLists} רשימות, ${stats.completionRate}% הושלמו. היום הכי פעיל: ${stats.mostActiveDay}.`);
  lines.push(`ציון קנייה: ${shoppingScore}/100. פרופיל קונה: ${shoppingPersonality.description}.`);

  if (topProducts.length > 0) {
    lines.push(`המוצרים הנפוצים ביותר: ${topProducts.slice(0, 8).map(p => `${p.name} (${p.count} פעמים)`).join(', ')}.`);
  }
  if (categoryBreakdown.length > 0) {
    lines.push(`פילוח קטגוריות: ${categoryBreakdown.slice(0, 6).map(c => `${c.category} ${c.percentage}%`).join(', ')}.`);
  }
  if (shoppingFrequency.avgDaysBetween > 0) {
    lines.push(`קונה בממוצע כל ${shoppingFrequency.avgDaysBetween} ימים.`);
  }
  if (spending?.enabled && spending.monthTotal !== null) {
    lines.push(`הוצאה חודשית משוערת (מבוסס התאמת מוצרים למאגר מחירים ממשלתי, לא מדויק): כ-${Math.round(spending.monthTotal)} ₪.`);
  }
  if (forgotten.length > 0) {
    lines.push(`מוצרים שהמשתמש הפסיק לקנות (אולי שכח): ${forgotten.slice(0, 5).map(f => f.name).join(', ')}.`);
  }
  if (upcomingNeeds.length > 0) {
    lines.push(`קטגוריות שכנראה צריך לחדש עכשיו: ${upcomingNeeds.slice(0, 5).map(u => u.category).join(', ')}.`);
  }
  if (streaks.currentWeeks >= 2) {
    lines.push(`סטריק קנייה נוכחי: ${streaks.currentWeeks} שבועות רצופים (השיא שלו: ${streaks.longestWeeks}).`);
  }
  if (monthComparison.hasBaseline && monthComparison.productsGrowth !== 0) {
    lines.push(`מגמה לעומת החודש הקודם: ${monthComparison.productsGrowth > 0 ? 'עלייה' : 'ירידה'} של ${Math.abs(monthComparison.productsGrowth)}% בכמות המוצרים.`);
  }
  if (anomalies.length > 0) {
    lines.push(`שינויים בהרגלי הקנייה: ${anomalies.slice(0, 3).map(a => a.description).join(', ')}.`);
  }
  if (groupStats.length > 0) {
    lines.push(`חבר ב-${groupStats.length} רשימות קבוצתיות: ${groupStats.slice(0, 8).map(g => `"${g.name}" (${g.membersCount} חברים)`).join(', ')}.`);
  }

  return lines.join('\n');
}

const SYSTEM_PROMPT_HEADER = `אתה "סל חכם" - העוזר הרשמי של אפליקציית SmartBasket לניהול רשימות קניות חכמות.

תפקידך הבלעדי הוא לעזור למשתמשים בנושאים הקשורים ישירות לקניות, אוכל וניהול הרשימות שלהם:
• שאלות על רשימות הקניות, מוצרים, קטגוריות, הרגלי קנייה
• השוואת מחירים, טיפים לחיסכון, מתי כדאי לקנות מה
• הבדלים בין רשתות סופרמרקט בישראל (שופרסל, רמי לוי, יינות ביתן, קרפור, טיב טעם וכו')
• ניתוח ההוצאות וההרגלים האישיים של המשתמש על סמך הנתונים שלו
• הצגת פיצ'רים שימושיים באפליקציה שהמשתמש אולי לא מכיר

פיצ'רים באפליקציה שאתה מכיר ויכול להמליץ עליהם:
• רשימות משותפות - אפשר להזמין בני משפחה/שותפים לרשימה דרך קוד הצטרפות (כפתור "הזמן חברים" בתוך הרשימה). כולם רואים ועורכים בזמן אמת.
• סריקת תמונת רשימה - ניתן לצלם רשימת קניות כתובה ביד ו-SmartBasket יוסיף את המוצרים אוטומטית (כפתור המצלמה בהוספת מוצר).
• השוואת מחירים - טאב "השוואה" מאפשר לחפש מוצר ולראות את המחיר שלו בכל הרשתות הגדולות בישראל לפי ממשלה. שימושי לפני יציאה לקנות.
• תובנות וסטטיסטיקות - טאב "תובנות" מציג ניתוח מעמיק: הוצאה חודשית משוערת, המוצרים הנפוצים ביותר, ניתוח לפי קטגוריות, ימי הקנייה, מגמות לאורך זמן ועוד.
• סימון קנייה בסוופ - בתוך הרשימה אפשר להחליק (swipe) מוצר ימינה כדי לסמן אותו כנקנה, בלי ללחוץ.
• בחירה מרובה - לחיצה ארוכה על מוצר פותחת מצב בחירה מרובה - אפשר לסמן כמה מוצרים ולמחוק/להעביר אותם ביחד.
• עריכת מוצר מפורטת - לחיצה על מוצר פותחת חלון פרטים עם שדות כמות, יחידה, קטגוריה והערה.
• ניקוי רשימה - אפשר לנקות רשימה בלחיצה אחת (מוצרים שנקנו או הכל) דרך תפריט האפשרויות של הרשימה.
• כפתור + מהיר - הכפתור הירוק הגדול בפינה פותח הוספת מוצר מהירה עם חיפוש וקטגוריה.
• פרופיל אישי - אפשר לשנות שם, תמונת פרופיל (אמוג'י + צבע), ולנהל הגדרות חשבון.
• התראות Push - ניתן להפעיל התראות כדי לקבל עדכון כשחבר מוסיף מוצר לרשימה משותפת.
• מצב אופליין - האפליקציה עובדת גם ללא אינטרנט ומסתנכרנת כשהחיבור חוזר.

כשנשאלת על נושא שאינו קשור לקניות, אוכל, סופרים, או ניהול רשימות - ענה בנימוס:
"אני כאן רק לענות על שאלות הקשורות לקניות ולרשימות שלך. נסה לשאול אותי על מוצרים, מחירים, או דרכי חיסכון בסופר 🛒"

כללי תגובה:
- קצר זה הכלל, לא היוצא מן הכלל: ברירת המחדל היא 1-2 משפטים. עד 3 נקודות
  (•) קצרות רק כשממש יש כמה פריטים נפרדים לרשימה - לא כברירת מחדל.
  אל תוסיף משפט הסבר/סיכום נוסף בסוף אם התשובה כבר ניתנה.
- ענה תמיד בעברית, בטון ידידותי וממוקד.
- אל תפתח במבוא ("שאלה מצוינת!" וכו') - עבור ישר לתשובה.
- כשאתה מסתמך על נתוני המשתמש - ציין זאת ("על סמך הרשימות שלך...").
- כשרלוונטי - הצע פיצ'ר באפליקציה שיכול לעזור ("אגב, אפשר גם...").
- אין לך גישה למחירים בזמן אמת - אם נשאלת על מחיר ספציפי עכשווי, הפנה לטאב "השוואת מחירים" באפליקציה.
- אל תמציא נתונים שלא סופקו לך.

נתוני הרשימות וההרגלים האמיתיים של המשתמש הנוכחי:`;

export interface AssistantStreamHandle {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  cleanup: () => void;
  providerName: string;
  // true אם זה לא הספק הראשון ברשימה (כלומר הספק הראשי נכשל ועברנו לגיבוי) -
  // ה-controller משתמש בזה כדי לשדר ללקוח חיווי עדין "עברנו למודל גיבוי".
  isFallback: boolean;
}

function makeFallbackStream(text: string): AssistantStreamHandle {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return {
    reader: stream.getReader(),
    cleanup: () => undefined,
    providerName: 'local-fallback',
    // לא isFallback:true - זו לא "תשובה ממודל גיבוי" אלא הודעת שירות קצרה.
    // התג "מודל גיבוי" בלקוח שמור למקרה ש-NIM (ספק אמיתי) ענה במקום Groq.
    isFallback: false,
  };
}

// טקסט גיבוי מקומי - קצר וכן. אין כאן LLM, אז לא מנסים "לענות" על השאלה,
// רק מסבירים למה העוזר לא זמין ומתי בערך לנסות שוב. lastError (אם קיים)
// מחדד את הסיבה: 429 = מכסת ספק נגמרה, timeout/network = עומס/תקלה זמנית.
function buildLocalFallbackText(lastError: string | null): string {
  if (!lastError) {
    return 'עוזר ה-AI לא מוגדר בשרת כרגע. נסה שוב מאוחר יותר 🙏';
  }
  const statusMatch = lastError.match(/^(\d{3})[:\s]/);
  if (statusMatch?.[1] === '429') {
    return 'עוזר ה-AI עמוס כרגע — המכסה של הספק נגמרה זמנית ומתחדשת מעצמה. נסה שוב בעוד כמה דקות 🙏';
  }
  if (/abort|timeout|fetch failed|network|enotfound|econnrefused/i.test(lastError)) {
    return 'עוזר ה-AI לא מגיב כרגע (עומס או תקלה זמנית אצל הספק). נסה שוב בעוד רגע.';
  }
  return 'עוזר ה-AI לא זמין כרגע. נסה שוב בעוד כמה דקות.';
}

/**
 * פותח חיבור streaming לעוזר ה-AI - מצרף את נתוני המשתמש האמיתיים כהקשר,
 * שולח ל-NVIDIA NIM עם stream:true ומחזיר reader לצריכת ה-SSE chunk-אחר-chunk.
 * כל שגיאות ה-setup/config/validation נזרקות כאן (לפני שנשלח דבר ללקוח) -
 * הצרכן (controller) אחראי רק על קריאת ה-stream והעברתו הלאה.
 */
export async function openAssistantStream(userId: string, messages: ChatMessage[]): Promise<AssistantStreamHandle> {
  if (messages.length === 0) {
    throw new AppError('No messages provided', 400, 'AI_ASSISTANT_EMPTY');
  }

  if (!isConfigured()) {
    logger.warn('aiAssistant: no provider key configured; using local fallback response');
    return makeFallbackStream(buildLocalFallbackText(null));
  }

  // התקציב היומי הגלובלי נגמר - הגנה אחרונה. בפועל ה-route guard
  // (aiAssistant.routes.ts) כבר עוצר את הבקשה עם 429 + resetAt לפני שהגענו
  // לכאן; זה כאן רק למקרה שהשירות נקרא מנתיב אחר בעתיד.
  if (aiBudgetExceeded()) {
    logger.warn('aiAssistant: global daily budget (%d) reached', AI_DAILY_BUDGET);
    throw new AppError('AI assistant daily limit reached', 429, 'AI_DAILY_LIMIT');
  }

  const trimmedHistory = messages.slice(-MAX_HISTORY_MESSAGES);
  for (const m of trimmedHistory) {
    if (m.content.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`, 400, 'AI_ASSISTANT_MESSAGE_TOO_LONG');
    }
  }

  // נתוני המשתמש: cache קצר (ראו CONTEXT_CACHE_TTL_MS) כדי לא להריץ אגרגציה
  // כבדה על כל הודעה בשיחה. אם השליפה נכשלת מסיבה כלשהי, השיחה ממשיכה בלי
  // הקשר אישי במקום ליפול לגמרי - עדיין אפשר לענות על שאלות כלליות.
  const cached = contextCache.get(userId);
  let userContext: string;
  if (cached && cached.expiresAt > Date.now()) {
    userContext = cached.context;
  } else {
    try {
      const [insights, lists] = await Promise.all([
        getUserInsights(userId, { includeSpending: true }),
        ListDAL.findUserLists(userId),
      ]);
      const listIds = lists.map(l => l._id);
      const products = await Product.find({ listId: { $in: listIds } }, 'listId name quantity unit isPurchased').lean();
      const productsByList = new Map(lists.map(l => [l._id.toString(), [] as typeof products]));
      for (const p of products) productsByList.get(p.listId.toString())?.push(p);
      const listsWithProducts: ListWithProducts[] = lists.map(l => ({
        name: l.name,
        icon: l.icon,
        items: (productsByList.get(l._id.toString()) ?? []).map(p => ({
          name: p.name, quantity: p.quantity, unit: p.unit, isPurchased: p.isPurchased,
        })),
      }));
      userContext = buildUserContext(insights, listsWithProducts);
    } catch (err) {
      logger.warn('aiAssistant: failed to fetch user insights for context, continuing without it: %s', (err as Error).message);
      userContext = 'לא ניתן היה לטעון את נתוני המשתמש כרגע.';
    }
    contextCache.set(userId, { context: userContext, expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS });
  }

  const systemMessage = { role: 'system' as const, content: `${SYSTEM_PROMPT_HEADER}\n${userContext}` };
  const body = {
    messages: [systemMessage, ...trimmedHistory],
    temperature: 0.6,
    max_tokens: 700,
    stream: true,
  };

  // נספר לפני הקריאה בפועל - בקשה שנכשלת על Groq ועוברת ל-NIM עדיין
  // נחשבת אחת לצורך התקציב (הערכה גסה, מספיקה כדי לא לחרוג בהרבה).
  recordAiRequest();

  const providers = await getProviders();
  let lastError: string | null = null;

  // מנסים כל ספק לפי סדר (Groq, אחר כך NIM). כשל בספק אחד (מכסה חינמית
  // נגמרה, שגיאת שרת, timeout) עובר לספק הבא במקום להיכשל למשתמש - כל עוד
  // יש עוד ספק מוגדר לנסות. כשל בכולם זורק שגיאה אחת מרוכזת בסוף.
  for (let providerIndex = 0; providerIndex < providers.length; providerIndex++) {
    const provider = providers[providerIndex];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const providerBody: Record<string, unknown> = { ...body, model: provider.model };
    if (isReasoningModel(provider.model)) providerBody.reasoning_effort = 'low';

    let response: Response;
    try {
      response = await fetch(provider.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(providerBody),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = (err as Error).message;
      const stats = getProviderStats(provider.name);
      stats.lastError = truncateRaw(lastError);
      stats.lastErrorReason = classifyError(null, lastError);
      stats.lastErrorAt = Date.now();
      logger.warn('aiAssistant: request to %s failed, trying next provider if available: %s', provider.name, lastError);
      continue;
    }

    if (!response.ok) {
      clearTimeout(timeoutId);
      const errText = await response.text().catch(() => '');
      lastError = `${response.status}: ${errText}`;
      const stats = getProviderStats(provider.name);
      stats.lastError = truncateRaw(lastError);
      stats.lastErrorReason = classifyError(response.status, errText);
      stats.lastErrorAt = Date.now();
      const rl = readRateLimit(response.headers);
      if (rl) stats.rateLimit = rl;
      logger.warn('aiAssistant: %s returned %s, trying next provider if available', provider.name, lastError);
      continue;
    }
    if (!response.body) {
      clearTimeout(timeoutId);
      lastError = 'empty response body';
      const stats = getProviderStats(provider.name);
      stats.lastError = lastError;
      stats.lastErrorReason = classifyError(null, lastError);
      stats.lastErrorAt = Date.now();
      logger.warn('aiAssistant: %s returned an empty response, trying next provider if available', provider.name);
      continue;
    }

    const stats = getProviderStats(provider.name);
    stats.requestCount++;
    stats.lastSuccessAt = Date.now();
    stats.lastError = null;
    stats.lastErrorReason = null;
    stats.lastErrorAt = null;
    const rl = readRateLimit(response.headers);
    if (rl) stats.rateLimit = rl;
    if (providerIndex > 0) fallbackCount++;

    return {
      reader: response.body.getReader(),
      cleanup: () => clearTimeout(timeoutId),
      providerName: provider.name,
      isFallback: providerIndex > 0,
    };
  }

  // כל הספקים נכשלו - במקום 502 + "משהו השתבש", מגישים תגובת גיבוי מקומית
  // קצרה שמסבירה מה קרה ומתי לנסות שוב. isFallback:true -> הלקוח מסמן את
  // הבועה כתשובת גיבוי (תג קטן), לא כשגיאה אדומה.
  logger.error('aiAssistant: all providers failed (%s), serving local fallback', lastError);
  fallbackCount++;
  return makeFallbackStream(buildLocalFallbackText(lastError));
}

export interface AiProviderStatus {
  name: string;
  role: 'primary' | 'backup';
  configured: boolean;
  model: string | null;
  modelResolvedAt: string | null;
  nextModelCheckAt: string | null;
  requestCount: number;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastErrorReason: string | null;
  lastErrorAt: string | null;
  rateLimit: AiProviderRateLimit | null;
}

export interface AiStatus {
  providers: AiProviderStatus[];
  fallbackCount: number;
  serverStartedAt: string;
  configured: boolean;
  // תקציב יומי גלובלי לקריאות AI חיצוניות (0 = בלי תקרה)
  dailyBudget: AiDailyBudgetStatus;
}

/** נתוני סטטוס לפאנל "פרטי AI" באדמין - איזה מודל פעיל, מתי עודכן, כמה נוצל ומתי מתאפס. */
export async function getAiStatus(): Promise<AiStatus> {
  const groqConfigured = !!env.GROQ_API_KEY;
  const nimConfigured = !!env.NVIDIA_NIM_API_KEY;
  const groqStats = getProviderStats('Groq');
  const nimStats = getProviderStats('NVIDIA NIM');

  const toIso = (ms: number | null) => (ms ? new Date(ms).toISOString() : null);

  return {
    providers: [
      {
        name: 'Groq',
        role: 'primary',
        configured: groqConfigured,
        model: groqConfigured ? (cachedGroqModel ?? env.GROQ_MODEL) : null,
        modelResolvedAt: groqConfigured ? toIso(groqModelCachedAt || null) : null,
        nextModelCheckAt: groqConfigured && groqModelCachedAt ? toIso(groqModelCachedAt + GROQ_MODEL_CACHE_TTL) : null,
        requestCount: groqStats.requestCount,
        lastSuccessAt: toIso(groqStats.lastSuccessAt),
        lastError: groqStats.lastError,
        lastErrorReason: groqStats.lastErrorReason,
        lastErrorAt: toIso(groqStats.lastErrorAt),
        rateLimit: groqStats.rateLimit,
      },
      {
        name: 'NVIDIA NIM',
        role: 'backup',
        configured: nimConfigured,
        model: nimConfigured ? env.NVIDIA_NIM_MODEL : null,
        modelResolvedAt: null,
        nextModelCheckAt: null,
        requestCount: nimStats.requestCount,
        lastSuccessAt: toIso(nimStats.lastSuccessAt),
        lastError: nimStats.lastError,
        lastErrorReason: nimStats.lastErrorReason,
        lastErrorAt: toIso(nimStats.lastErrorAt),
        rateLimit: nimStats.rateLimit,
      },
    ],
    fallbackCount,
    serverStartedAt: new Date(serverStartedAt).toISOString(),
    configured: groqConfigured || nimConfigured,
    dailyBudget: getAiDailyBudget(),
  };
}

/** מאלץ בדיקה מחדש של המודל הטוב ביותר ב-Groq עכשיו, בלי לחכות ל-cache השעתי. */
export async function refreshAiStatus(): Promise<AiStatus> {
  if (env.GROQ_API_KEY) {
    groqModelCachedAt = 0;
    await resolveGroqModel(env.GROQ_API_KEY);
  }
  return getAiStatus();
}
