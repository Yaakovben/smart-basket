// יומן אבחון "שורד קריסה" - לשימוש בדיוק במקרה שהאפליקציה נסגרת/נהרגת
// באמצע (לדוגמה ע"י iOS) בלי הזדמנות לשלוח משהו לשרת או ל-Sentry.
//
// כל שורה נכתבת ל-localStorage באופן סינכרוני ברגע שהיא קורית (לא batched,
// לא async) - כך שגם אם התהליך נהרג פתאומית, כל מה שנרשם עד הרגע האחרון
// כבר על הדיסק. ב-Boot הבא (בדיוק התרחיש של "פתיחה שנייה" שדווח) קוראים
// את היומן מהפעם הקודמת ומציגים אותו ישירות על המסך - בלי צורך ב-Mac/
// Web Inspector, כי לפעמים אין גישה לזה.
// היסטוריה של כמה סשנים אחרונים (לא רק "הקודם") - כי פתיחה נוספת בין
// קריסה לבין שליחת הלוג הייתה מוחקת את הראיה האמיתית (זה בדיוק מה שקרה).
// עכשיו כל סשן נשמר בנפרד; אין תלות בתזמון מדויק של המשתמש.
const HISTORY_KEY = 'sb_crash_log_history';
const MAX_SESSIONS = 8;
const MAX_ENTRIES = 150;

interface LogEntry {
  t: number; // מילישניות מתחילת הסשן
  msg: string;
}

interface SessionLog {
  start: number;
  entries: LogEntry[];
}

let entries: LogEntry[] = [];
let sessionStart = Date.now();

// cache בזיכרון של ההיסטוריה המפוענחת - נמנע מ-JSON.parse מחדש של כל
// ההיסטוריה (עד 8 סשנים × 150 שורות) בכל קריאה בודדת ל-diagLog. לפני
// התיקון persist() קראה מ-localStorage ופענחה מחדש בכל קריאה, כולל
// ה-heartbeat כל 1.5 שניות לכל אורך חיי הסשן, ובכמה קריאות diagLog
// שרצות באופן סינכרוני בדיוק בחלון הקריטי של עליית האפליקציה (module
// eval, לפני/אחרי render()). ה-write ל-localStorage עצמו נשאר סינכרוני
// בכל קריאה (זו הערבות ל"שרד קריסה"), רק ה-read מוזז ל-cache חד-פעמי.
let cachedHistory: SessionLog[] | null = null;

function readHistory(): SessionLog[] {
  if (cachedHistory) return cachedHistory;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    cachedHistory = raw ? JSON.parse(raw) : [];
  } catch {
    cachedHistory = [];
  }
  return cachedHistory!;
}

function persist() {
  try {
    // מעדכנים את הסשן הנוכחי בתוך ההיסטוריה (לא דורסים סשנים קודמים)
    const history = readHistory();
    const idx = history.findIndex(s => s.start === sessionStart);
    const current: SessionLog = { start: sessionStart, entries };
    if (idx >= 0) history[idx] = current;
    else history.push(current);
    const trimmed = history.slice(-MAX_SESSIONS);
    cachedHistory = trimmed;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* quota/blocked - לא קריטי, עדיין יש console.log */ }
}

/** מתחיל סשן חדש בהיסטוריה (לא מוחק סשנים קודמים) */
function rotateCrashLog(): void {
  entries = [];
  sessionStart = Date.now();
  diagLog('boot', 'new session started');
}

/** מחזיר את כל הסשנים השמורים (מהישן לחדש), לתצוגה/דיבוג. */
export function getSessionHistory(): SessionLog[] {
  return readHistory();
}

export function clearSessionHistory(): void {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  // מאפסים גם את ה-cache - אחרת diagLog הבא היה מחזיר את ההיסטוריה הישנה
  // מהזיכרון ומחייה אותה בחזרה ל-localStorage בכתיבה הבאה.
  cachedHistory = null;
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
