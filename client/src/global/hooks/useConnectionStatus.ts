// מצב חיבור גלובלי (מכשיר offline / socket מנותק) - הוצא מ-OfflineBanner
// כדי שגם רכיבים אחרים (אייקון inline בכותרות) יוכלו להשתמש באותו state,
// בלי לשכפל את לוגיקת ה-timers/socket listeners בכל מקום.
import { useState, useEffect, useRef } from 'react';
import { subscribeToQueueCount } from '../../services/offlineQueue';
import { socketService } from '../../services/socket/socket.service';

export type ConnectionPhase = 'online' | 'trying' | 'offline' | 'reconnecting';

const OFFLINE_CONFIRM_MS = 8000;
const SOCKET_GRACE_MS = 4000;

export function useConnectionStatus() {
  const [phase, setPhase] = useState<ConnectionPhase>(() => navigator.onLine ? 'online' : 'offline');
  const [pendingCount, setPendingCount] = useState(0);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketDownRef = useRef(false);

  useEffect(() => {
    const clearOfflineTimer = () => {
      if (offlineTimerRef.current) { clearTimeout(offlineTimerRef.current); offlineTimerRef.current = null; }
    };

    const handleOffline = () => {
      setPhase('trying');
      clearOfflineTimer();
      offlineTimerRef.current = setTimeout(() => setPhase('offline'), OFFLINE_CONFIRM_MS);
    };

    const handleOnline = () => {
      clearOfflineTimer();
      setPhase(socketDownRef.current ? 'reconnecting' : 'online');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) {
      setPhase('trying');
      offlineTimerRef.current = setTimeout(() => setPhase('offline'), OFFLINE_CONFIRM_MS);
    }

    return () => {
      clearOfflineTimer();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    const clearSocketTimer = () => {
      if (socketTimerRef.current) { clearTimeout(socketTimerRef.current); socketTimerRef.current = null; }
    };

    const scheduleReconnecting = () => {
      clearSocketTimer();
      socketTimerRef.current = setTimeout(() => {
        socketDownRef.current = true;
        if (navigator.onLine) setPhase(p => (p === 'online' ? 'reconnecting' : p));
      }, SOCKET_GRACE_MS);
    };

    const handleConnected = () => {
      clearSocketTimer();
      socketDownRef.current = false;
      setPhase(p => (p === 'reconnecting' ? 'online' : p));
    };

    const unsubDisconnect = socketService.on('disconnect', scheduleReconnecting);
    const unsubConnectError = socketService.on('connect_error', scheduleReconnecting);
    const unsubConnect = socketService.on('connect', handleConnected);

    if (!socketService.isConnected()) scheduleReconnecting();

    return () => {
      clearSocketTimer();
      unsubDisconnect();
      unsubConnectError();
      unsubConnect();
    };
  }, []);

  useEffect(() => subscribeToQueueCount(setPendingCount), []);

  return { phase, pendingCount };
}
