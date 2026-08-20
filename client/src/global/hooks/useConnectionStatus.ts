// מצב חיבור גלובלי (מכשיר offline / socket מנותק) - state יחיד ברמת המודול,
// לא state מקומי שנוצר מחדש בכל mount. ConnectionStatusIcon מוצג בכותרת
// של כל דף (בית, רשימה, תובנות, מנהל...), וכל מעבר ניווט ממחזר-mounting
// אותו. לפני התיקון, ה-state/הטיימרים/המאזינים נוצרו מחדש בכל hook call -
// כלומר גם ב-timer של "trying" (8 שניות) וגם "reconnecting" (4 שניות)
// התאפסו בכל מעבר דף, ומצב "אין קליטה" שכבר זוהה בעמוד A היה נעלם ומתחיל
// מחדש להמתין בעמוד B, במקום פשוט להמשיך להציג את המצב האמיתי שכבר נקבע.
// עכשיו האתחול (מאזיני online/offline/socket) רץ פעם אחת בלבד ברמת המודול
// (כמו ה-heartbeat ב-crashLog.ts), וכל hook רק נרשם ל-snapshot המשותף.
import { useSyncExternalStore } from 'react';
import { subscribeToQueueCount } from '../../services/offlineQueue';
import { socketService } from '../../services/socket/socket.service';

export type ConnectionPhase = 'online' | 'trying' | 'offline' | 'reconnecting';

const OFFLINE_CONFIRM_MS = 8000;
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
  socketTimer = setTimeout(() => {
    socketDown = true;
    if (navigator.onLine && state.phase === 'online') setState({ phase: 'reconnecting' });
  }, SOCKET_GRACE_MS);
}

function handleSocketConnected() {
  clearSocketTimer();
  socketDown = false;
  if (state.phase === 'reconnecting') setState({ phase: 'online' });
}

socketService.on('disconnect', scheduleReconnecting);
socketService.on('connect_error', scheduleReconnecting);
socketService.on('connect', handleSocketConnected);
if (!socketService.isConnected()) scheduleReconnecting();

subscribeToQueueCount(n => setState({ pendingCount: n }));

export function useConnectionStatus() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
