// מצב חיבור גלובלי (מכשיר offline / socket מנותק) - state יחיד ברמת המודול,
// לא state מקומי שנוצר מחדש בכל mount. בעבר ConnectionStatusIcon היה
// מוטמע בנפרד בתוך כותרת כל דף (בית, רשימה, תובנות, מנהל...), וכל מעבר
// ניווט ממחזר-mounting אותו: ה-state/הטיימרים/המאזינים נוצרו מחדש בכל
// קריאה ל-hook - גם ב-timer של "trying" (8 שניות) וגם "reconnecting"
// (4 שניות) התאפסו בכל מעבר דף, ומצב "אין קליטה" שכבר זוהה בעמוד A היה
// נעלם ומתחיל מחדש להמתין בעמוד B. עכשיו גם ה-hook הזה singleton וגם
// ConnectionStatusIcon עצמו mounted פעם אחת בלבד גלובלית (ראו AppRouter) -
// האתחול (מאזיני online/offline/socket) רץ פעם אחת ברמת המודול (כמו
// ה-heartbeat ב-crashLog.ts), וכל hook רק נרשם ל-snapshot המשותף.
import { useSyncExternalStore } from 'react';
import { subscribeToQueueCount } from '../../services/offlineQueue';
import { socketService } from '../../services/socket/socket.service';
import { subscribeFetchIssue } from '../services/connectionIssue';
import { wasVersionUpgrade } from '../services/versionUpgrade';
import { clearCacheAndReload } from '../helpers/clearCacheAndReload';

export type ConnectionPhase = 'online' | 'trying' | 'offline' | 'reconnecting' | 'server-starting';

const OFFLINE_CONFIRM_MS = 3000;
const SOCKET_GRACE_MS = 4000;

interface ConnectionState {
  phase: ConnectionPhase;
  pendingCount: number;
}

let state: ConnectionState = { phase: navigator.onLine ? 'online' : 'offline', pendingCount: 0 };
const listeners = new Set<() => void>();

function setState(patch: Partial<ConnectionState>) {
  const prevPhase = state.phase;
  state = { ...state, ...patch };
  if (state.phase !== prevPhase) {
    if (state.phase === 'server-starting' || state.phase === 'reconnecting') {
      maybeScheduleStuckReload();
    } else {
      clearStuckTimer();
    }
  }
  listeners.forEach(l => l());
}

// חיבור תקוע (server-starting/reconnecting) שנמשך זמן ממושך *אחרי* שדיפלוי
// חדש התגלה בביקור הזה (wasVersionUpgrade - ראו App.tsx/versionUpgrade.ts)
// הוא כמעט תמיד JS ישן שקורא לחוזה API/socket שכבר השתנה - לא באמת בעיית
// רשת. מרעננים אוטומטית *רק* במצב הזה, כי: (1) החיבור כבר שבור בפועל -
// אין session פעיל לקטוע, (2) תור הפעולות האופליין ב-IndexedDB שורד רענון
// בלי אובדן, (3) בלי wasVersionUpgrade זה יכול להיות סתם שרת קר או תקלת
// רשת רגילה אצל מי שכבר על הגרסה העדכנית - שם רענון לא עוזר ורק מפריע.
// תקופת חסד לפני הריענון (מתבטלת אם ההתחברות מצליחה בינתיים) + קירור בין
// ריענונים מונעים לולאה אם הריענון עצמו לא פתר את זה.
const STUCK_RELOAD_KEY = 'sb_stuck_connection_reload';
const STUCK_GRACE_MS = 15_000;
const STUCK_COOLDOWN_MS = 60_000;
let stuckTimer: ReturnType<typeof setTimeout> | null = null;

function clearStuckTimer() {
  if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null; }
}

function maybeScheduleStuckReload() {
  if (stuckTimer) return;
  if (!wasVersionUpgrade()) return;
  stuckTimer = setTimeout(() => {
    stuckTimer = null;
    if (!navigator.onLine) return;
    if (state.phase !== 'server-starting' && state.phase !== 'reconnecting') return;
    let last = 0;
    try { last = Number(localStorage.getItem(STUCK_RELOAD_KEY) || 0); } catch { /* ignore */ }
    if (last && Date.now() - last < STUCK_COOLDOWN_MS) return;
    try { localStorage.setItem(STUCK_RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }
    void clearCacheAndReload();
  }, STUCK_GRACE_MS);
}

function getSnapshot(): ConnectionState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let offlineTimer: ReturnType<typeof setTimeout> | null = null;
let socketTimer: ReturnType<typeof setTimeout> | null = null;
let socketDown = false;
// true רק אחרי שה-socket הצליח פעם אחת. בלי זה, scheduleReconnecting
// שרץ מיד בעליית האפליקציה (socket עוד לא הספיק להתחבר בכלל - handshake
// רגיל, לא תקלה) היה מציג את הפס "החיבור נקטע" אחרי 4 שניות על כל כניסה
// רגילה לאפליקציה, אפילו כשהכל תקין - "מתחבר" ראשוני הוצג כ"התנתק".
let hasEverConnected = false;

function clearOfflineTimer() {
  if (offlineTimer) { clearTimeout(offlineTimer); offlineTimer = null; }
}
function clearSocketTimer() {
  if (socketTimer) { clearTimeout(socketTimer); socketTimer = null; }
}

function handleOffline() {
  setState({ phase: 'trying' });
  clearOfflineTimer();
  offlineTimer = setTimeout(() => setState({ phase: 'offline' }), OFFLINE_CONFIRM_MS);
}

function handleOnline() {
  clearOfflineTimer();
  setState({ phase: socketDown ? 'reconnecting' : 'online' });
}

window.addEventListener('offline', handleOffline);
window.addEventListener('online', handleOnline);
if (!navigator.onLine) {
  state = { ...state, phase: 'trying' };
  offlineTimer = setTimeout(() => setState({ phase: 'offline' }), OFFLINE_CONFIRM_MS);
}

function scheduleReconnecting() {
  clearSocketTimer();
  // חיבור ראשוני שעדיין לא הצליח אף פעם - לא "התנתק", פשוט עדיין מתחבר.
  // לא מתזמנים בכלל שום חיווי "reconnecting" עד שהיה חיבור אחד מוצלח.
  if (!hasEverConnected) return;
  socketTimer = setTimeout(() => {
    socketDown = true;
    if (navigator.onLine && state.phase === 'online') setState({ phase: 'reconnecting' });
  }, SOCKET_GRACE_MS);
}

function handleSocketConnected() {
  clearSocketTimer();
  socketDown = false;
  hasEverConnected = true;
  if (state.phase === 'reconnecting') setState({ phase: 'online' });
}

socketService.on('disconnect', scheduleReconnecting);
socketService.on('connect_error', scheduleReconnecting);
socketService.on('connect', handleSocketConnected);

subscribeToQueueCount(n => setState({ pendingCount: n }));

// fetchIssue=true כשטעינת הרשימות/התראות הראשונית נכשלת (שרת קר / אין קליטה).
// מוצג רק כש-online ולא כבר מוצג חיווי אחר - שכבת "מתחבר לשרת..." שנעלמת
// ברגע שהשרת מתעורר והנתונים מגיעים.
subscribeFetchIssue(active => {
  const currentPhase = state.phase;
  if (active && (currentPhase === 'online' || currentPhase === 'server-starting')) {
    setState({ phase: 'server-starting' });
  } else if (!active && currentPhase === 'server-starting') {
    setState({ phase: 'online' });
  }
});

export function useConnectionStatus() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
