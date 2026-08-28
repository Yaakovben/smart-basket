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

export type ConnectionPhase = 'online' | 'trying' | 'offline' | 'reconnecting';

const OFFLINE_CONFIRM_MS = 3000;
const SOCKET_GRACE_MS = 4000;

interface ConnectionState {
  phase: ConnectionPhase;
  pendingCount: number;
}

let state: ConnectionState = { phase: navigator.onLine ? 'online' : 'offline', pendingCount: 0 };
const listeners = new Set<() => void>();

function setState(patch: Partial<ConnectionState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
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

export function useConnectionStatus() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
