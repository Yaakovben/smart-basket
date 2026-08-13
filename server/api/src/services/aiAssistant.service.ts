/**
 * aiAssistant.service.ts
 *
 * צ'אט עוזר AI: עונה על שאלות כלליות (סופרים, מחירים, טיפים לקנייה חכמה)
 * וגם נותן המלצות מבוססות-נתונים על סמך התובנות/ההוצאות האמיתיות של המשתמש.
 * מבוסס על Groq - endpoint תואם OpenAI (console.groq.com), טייר חינמי עם
 * חומרת LPU ייעודית שמריצה מודלים כמו Llama 3.3 70B מהר משמעותית מ-GPU
 * רגיל. מפתח ה-API הוא סוד אמיתי - נשמר רק כמשתנה סביבה בשרת, אף פעם לא
 * נשלח ללקוח.
 *
 * קובץ מבודד בכוונה: אם Groq יוחלף בספק אחר (OpenAI/Anthropic/וכו'),
 * זה שינוי מקומי כאן בלבד - שום קוד אחר לא תלוי בספק הספציפי.
 */

import { logger } from '../config';
import { env } from '../config/environment';
import { AppError } from '../errors';
import { getUserInsights } from './insights.service';
import { ListDAL } from '../dal/list.dal';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// מגבלות על גודל הקלט - מונע ניצול לרעה של המכסה (הודעה ענקית/היסטוריה
// אינסופית) ושומר על עלות/latency סבירים.
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 20;

// getUserInsights מריץ אגרגציה כבדה (כל המוצרים של המשתמש + group stats +
// spending) - יקר מדי להריץ מחדש על כל הודעה בודדת בשיחה. cache קצר בזיכרון
// (לא Redis - תהליך יחיד, TTL קצר מספיק) מוריד את זה לפעם אחת לכמה דקות
// במקום לכל הודעה, בלי לפגוע משמעותית בטריות הנתונים לצורך שיחת צ'אט.
const CONTEXT_CACHE_TTL_MS = 3 * 60 * 1000;
const contextCache = new Map<string, { context: string; expiresAt: number }>();

function isConfigured(): boolean {
  return !!env.GROQ_API_KEY;
}

// תמצות תובנות המשתמש לטקסט קצר וקריא ל-LLM - לא שולחים את כל אובייקט
// ה-InsightsData הגולמי (ענק, ברובו לא רלוונטי לשיחה, מכביד על ה-context).
function buildUserContext(insights: Awaited<ReturnType<typeof getUserInsights>>, listNames: string[]): string {
  const {
    stats, topProducts, categoryBreakdown, spending, shoppingFrequency, forgotten, upcomingNeeds,
    shoppingScore, shoppingPersonality, streaks, monthComparison, anomalies, groupStats,
  } = insights;

  if (stats.totalProducts === 0) {
    return 'למשתמש הזה אין עדיין נתוני קנייה (רשימות ריקות או חדש באפליקציה).';
  }

  const lines: string[] = [];
  if (listNames.length > 0) {
    lines.push(`הרשימות של המשתמש: ${listNames.join(', ')}.`);
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
    lines.push(`חבר ב-${groupStats.length} רשימות קבוצתיות: ${groupStats.slice(0, 3).map(g => `"${g.name}" (${g.membersCount} חברים)`).join(', ')}.`);
  }

  return lines.join('\n');
}

const SYSTEM_PROMPT_HEADER = `אתה "סל חכם" - העוזר הרשמי של אפליקציית SmartBasket לניהול רשימות קניות חכמות.

תפקידך הבלעדי הוא לעזור למשתמשים בנושאים הקשורים ישירות לקניות, אוכל וניהול הרשימות שלהם:
• שאלות על רשימות הקניות, מוצרים, קטגוריות, הרגלי קנייה
• השוואת מחירים, טיפים לחיסכון, מתי כדאי לקנות מה
• הבדלים בין רשתות סופרמרקט בישראל (שופרסל, רמי לוי, יינות ביתן, קרפור, טיב טעם וכו')
• ניתוח ההוצאות וההרגלים האישיים של המשתמש על סמך הנתונים שלו

כשנשאלת על נושא שאינו קשור לקניות, אוכל, סופרים, או ניהול רשימות - ענה בנימוס:
"אני כאן רק לענות על שאלות הקשורות לקניות ולרשימות שלך. נסה לשאול אותי על מוצרים, מחירים, או דרכי חיסכון בסופר 🛒"

כללי תגובה:
- ענה תמיד בעברית, בטון ידידותי וממוקד. מקסימום 3-4 משפטים, או 4-5 נקודות - לא יותר.
- כשמתאים - נסח כנקודות קצרות (•). שאלה פשוטה = תשובה של משפט-שניים.
- אל תפתח במבוא ("שאלה מצוינת!" וכו') - עבור ישר לתשובה.
- כשאתה מסתמך על נתוני המשתמש - ציין זאת ("על סמך הרשימות שלך...").
- אין לך גישה למחירים בזמן אמת - אם נשאלת על מחיר ספציפי עכשווי, הפנה לטאב "השוואת מחירים" באפליקציה.
- אל תמציא נתונים שלא סופקו לך.

נתוני הרשימות וההרגלים האמיתיים של המשתמש הנוכחי:`;

export interface AssistantStreamHandle {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  cleanup: () => void;
}

/**
 * פותח חיבור streaming לעוזר ה-AI - מצרף את נתוני המשתמש האמיתיים כהקשר,
 * שולח ל-NVIDIA NIM עם stream:true ומחזיר reader לצריכת ה-SSE chunk-אחר-chunk.
 * כל שגיאות ה-setup/config/validation נזרקות כאן (לפני שנשלח דבר ללקוח) -
 * הצרכן (controller) אחראי רק על קריאת ה-stream והעברתו הלאה.
 */
export async function openAssistantStream(userId: string, messages: ChatMessage[]): Promise<AssistantStreamHandle> {
  if (!isConfigured()) {
    throw new AppError('AI assistant is not configured on this server', 503, 'AI_ASSISTANT_NOT_CONFIGURED');
  }
  if (messages.length === 0) {
    throw new AppError('No messages provided', 400, 'AI_ASSISTANT_EMPTY');
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
      const listNames = lists.map(l => `${l.icon || ''} ${l.name}`.trim());
      userContext = buildUserContext(insights, listNames);
    } catch (err) {
      logger.warn('aiAssistant: failed to fetch user insights for context, continuing without it: %s', (err as Error).message);
      userContext = 'לא ניתן היה לטעון את נתוני המשתמש כרגע.';
    }
    contextCache.set(userId, { context: userContext, expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS });
  }

  const systemMessage = { role: 'system' as const, content: `${SYSTEM_PROMPT_HEADER}\n${userContext}` };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages: [systemMessage, ...trimmedHistory],
        temperature: 0.6,
        max_tokens: 400,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    logger.warn('aiAssistant: request to Groq failed: %s', (err as Error).message);
    throw new AppError('AI assistant request failed', 502, 'AI_ASSISTANT_UPSTREAM_ERROR');
  }

  if (!response.ok) {
    clearTimeout(timeoutId);
    const errText = await response.text().catch(() => '');
    logger.warn(`aiAssistant: Groq returned ${response.status}: ${errText}`);
    throw new AppError('AI assistant request failed', 502, 'AI_ASSISTANT_UPSTREAM_ERROR');
  }
  if (!response.body) {
    clearTimeout(timeoutId);
    throw new AppError('AI assistant returned an empty response', 502, 'AI_ASSISTANT_EMPTY_RESPONSE');
  }

  return { reader: response.body.getReader(), cleanup: () => clearTimeout(timeoutId) };
}
