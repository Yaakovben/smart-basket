// יומן אבחון "שורד קריסה" - לשימוש בדיוק במקרה שהאפליקציה נסגרת/נהרגת
// באמצע (לדוגמה ע"י iOS) בלי הזדמנות לשלוח משהו לשרת או ל-Sentry.
//
// כל שורה נכתבת ל-localStorage באופן סינכרוני ברגע שהיא קורית (לא batched,
// לא async) - כך שגם אם התהליך נהרג פתאומית, כל מה שנרשם עד הרגע האחרון
// כבר על הדיסק. ב-Boot הבא (בדיוק התרחיש של "פתיחה שנייה" שדווח) קוראים
// את היומן מהפעם הקודמת ומציגים אותו ישירות על המסך - בלי צורך ב-Mac/
// Web Inspector, כי לפעמים אין גישה לזה.
const LOG_KEY = 'sb_crash_log';
const PREV_LOG_KEY = 'sb_crash_log_prev';
const MAX_ENTRIES = 150;

interface LogEntry {
  t: number; // מילישניות מתחילת הסשן הנוכחי
  msg: string;
}

let entries: LogEntry[] = [];
let sessionStart = Date.now();

function persist() {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify({ start: sessionStart, entries }));
  } catch { /* quota/blocked - לא קריטי, עדיין יש console.log */ }
}

/** מעביר את היומן של הסשן הקודם לפני שמתחילים לכתוב חדש */
function rotateCrashLog(): void {
  try {
    const prev = localStorage.getItem(LOG_KEY);
    if (prev) localStorage.setItem(PREV_LOG_KEY, prev);
  } catch { /* ignore */ }
  entries = [];
  sessionStart = Date.now();
  diagLog('boot', 'new session started');
}

/** מחזיר את יומן הסשן הקודם (אם יש), לתצוגה/דיבוג. null אם אין. */
export function getPreviousSessionLog(): { start: number; entries: LogEntry[] } | null {
  try {
    const raw = localStorage.getItem(PREV_LOG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPreviousSessionLog(): void {
  try { localStorage.removeItem(PREV_LOG_KEY); } catch { /* ignore */ }
}

/** רישום אבחון - console.log רגיל + שמירה סינכרונית ל-localStorage */
export function diagLog(tag: string, msg: string): void {
  const line = `[${tag}] ${msg}`;
  console.log(`[diag +${Date.now() - sessionStart}ms] ${line}`);
  entries.push({ t: Date.now() - sessionStart, msg: line });
  if (entries.length > MAX_ENTRIES) entries.shift();
  persist();
}

// heartbeat - כל 1.5 שניות, כדי שכשנקרא את היומן נדע בדיוק כמה זמן
// האפליקציה "הייתה בחיים" לפני שהיא נעלמה, לא רק אילו אירועים קרו.
let heartbeatId: ReturnType<typeof setInterval> | null = null;
function startHeartbeat(): void {
  if (heartbeatId) return;
  heartbeatId = setInterval(() => {
    entries.push({ t: Date.now() - sessionStart, msg: '[heartbeat] alive' });
    if (entries.length > MAX_ENTRIES) entries.shift();
    persist();
  }, 1500);
}

// חייבים לרוץ כאן, ברמת המודול, לא כקריאה מפורשת מ-main.tsx - כי סדר
// evaluation של ES modules טוען את App.tsx (וקורא ל-handleNewVersion,
// שכבר קורא ל-diagLog) *לפני* שגוף main.tsx עצמו מתחיל לרוץ. אם rotateCrashLog
// הייתה נקראת משם, היא הייתה רצה אחרי שכבר נכתבה שורה אחת מהסשן הנוכחי,
// ומוחקת בטעות את היומן העשיר האמיתי של הסשן הקודם (בדיוק מה שקרה בפועל -
// זה מה שגרם ליומן להיראות עם שורה בודדת בלבד). מודול נטען פעם אחת בלבד
// לכל הרצה, כך שזה בטוח שירוץ מוקדם ורק פעם אחת.
rotateCrashLog();
startHeartbeat();
