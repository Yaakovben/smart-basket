/**
 * aiAssistant.service.ts
 *
 * צ'אט עוזר AI: עונה על שאלות כלליות (סופרים, מחירים, טיפים לקנייה חכמה)
 * וגם נותן המלצות מבוססות-נתונים על סמך התובנות/ההוצאות האמיתיות של המשתמש.
 * מבוסס על NVIDIA NIM - endpoint תואם OpenAI (build.nvidia.com), preview
 * חינמי. מפתח ה-API הוא סוד אמיתי - נשמר רק כמשתנה סביבה בשרת, אף פעם לא
 * נשלח ללקוח.
 *
 * קובץ מבודד בכוונה: אם NVIDIA NIM יוחלף בספק אחר (OpenAI/Anthropic/וכו'),
 * זה שינוי מקומי כאן בלבד - שום קוד אחר לא תלוי בספק הספציפי.
 */

import { logger } from '../config';
import { env } from '../config/environment';
import { AppError } from '../errors';
import { getUserInsights } from './insights.service';

const NIM_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// מגבלות על גודל הקלט - מונע ניצול לרעה של המכסה (הודעה ענקית/היסטוריה
// אינסופית) ושומר על עלות/latency סבירים.
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 20;

function isConfigured(): boolean {
  return !!env.NVIDIA_NIM_API_KEY;
}

// תמצות תובנות המשתמש לטקסט קצר וקריא ל-LLM - לא שולחים את כל אובייקט
// ה-InsightsData הגולמי (ענק, ברובו לא רלוונטי לשיחה, מכביד על ה-context).
function buildUserContext(insights: Awaited<ReturnType<typeof getUserInsights>>): string {
  const { stats, topProducts, categoryBreakdown, spending, shoppingFrequency, forgotten, upcomingNeeds } = insights;

  if (stats.totalProducts === 0) {
    return 'למשתמש הזה אין עדיין נתוני קנייה (רשימות ריקות או חדש באפליקציה).';
  }

  const lines: string[] = [];
  lines.push(`סה"כ ${stats.totalProducts} מוצרים ב-${stats.totalLists} רשימות, ${stats.completionRate}% הושלמו.`);

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

  return lines.join('\n');
}

const SYSTEM_PROMPT_HEADER = `אתה העוזר החכם של SmartBasket - אפליקציית רשימות קניות. תפקידך:
1. לענות על שאלות כלליות בנושא קניות וסופרמרקטים - השוואת מחירים, טיפים לחיסכון, מתי כדאי לקנות מה, הבדלים בין רשתות בישראל וכו'.
2. לתת המלצות אישיות מבוססות על נתוני הקנייה האמיתיים של המשתמש (מצורפים למטה).

כללים:
- ענה תמיד בעברית, בטון ידידותי וממוקד. תשובות קצרות-בינוניות, לא חיבורים.
- כשאתה נותן המלצה שמבוססת על הנתונים האמיתיים של המשתמש - ציין את זה במפורש ("על סמך ההיסטוריה שלך...").
- אם שאלה כללית ולא קשורה לנתוני המשתמש - אין צורך להזכיר את הנתונים, פשוט תענה על השאלה.
- אתה לא יודע מחירים עדכניים בזמן אמת של רשתות ספציפיות - אם נשאלת על מחיר מדויק עכשווי, אמור זאת בכנות והצע להסתכל בטאב "השוואת מחירים" באפליקציה.
- אל תמציא נתונים שלא סופקו לך.

נתוני הקנייה האמיתיים של המשתמש הנוכחי:`;

/** שיחה עם עוזר ה-AI - מצרף את נתוני המשתמש האמיתיים כהקשר, שולח ל-NVIDIA NIM ומחזיר תשובה. */
export async function chatWithAssistant(userId: string, messages: ChatMessage[]): Promise<string> {
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

  // נתוני המשתמש נשלפים בכל קריאה (לא cache) - תמיד עדכניים לרגע השאלה.
  // אם השליפה נכשלת מסיבה כלשהי, השיחה ממשיכה בלי הקשר אישי במקום ליפול
  // לגמרי - עדיין אפשר לענות על שאלות כלליות (סופרים/מחירים).
  let userContext = '';
  try {
    const insights = await getUserInsights(userId);
    userContext = buildUserContext(insights);
  } catch (err) {
    logger.warn('aiAssistant: failed to fetch user insights for context, continuing without it: %s', (err as Error).message);
    userContext = 'לא ניתן היה לטעון את נתוני המשתמש כרגע.';
  }

  const systemMessage = { role: 'system' as const, content: `${SYSTEM_PROMPT_HEADER}\n${userContext}` };

  let content: string | undefined;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch(NIM_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.NVIDIA_NIM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.NVIDIA_NIM_MODEL,
        messages: [systemMessage, ...trimmedHistory],
        temperature: 0.6,
        max_tokens: 700,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      logger.warn(`aiAssistant: NVIDIA NIM returned ${response.status}: ${errText}`);
      throw new AppError('AI assistant request failed', 502, 'AI_ASSISTANT_UPSTREAM_ERROR');
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    content = data.choices?.[0]?.message?.content;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.warn('aiAssistant: request to NVIDIA NIM failed: %s', (err as Error).message);
    throw new AppError('AI assistant request failed', 502, 'AI_ASSISTANT_UPSTREAM_ERROR');
  }

  if (!content) {
    throw new AppError('AI assistant returned an empty response', 502, 'AI_ASSISTANT_EMPTY_RESPONSE');
  }

  return content;
}
