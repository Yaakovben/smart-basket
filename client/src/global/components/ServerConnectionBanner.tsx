import { useState, useEffect } from 'react';
import { socketService } from '../../services/socket/socket.service';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

interface Props {
  visible: boolean;
}

const GRACE_MS = 4000;

// באנר עליון יחיד - "אין חיבור לשרת".
// מוצג כשה-caller מדווח על fetch שנכשל, או כשה-socket מנותק בזמן אמת.
// בסביבת DEV: רק שגיאות fetch אמיתיות - לא ספינר על המתנה לsocket.
export const ServerConnectionBanner = ({ visible }: Props) => {
  const [deviceOnline, setDeviceOnline] = useState(navigator.onLine);
  const [socketDisconnected, setSocketDisconnected] = useState(false);
  const [fetchErrorConfirmed, setFetchErrorConfirmed] = useState(false);

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) setFetchErrorConfirmed(false);
  }

  useEffect(() => {
    const handleOnline = () => setDeviceOnline(true);
    const handleOffline = () => { setDeviceOnline(false); setSocketDisconnected(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setFetchErrorConfirmed(true), GRACE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleShow = () => {
      if (disconnectTimer) return;
      disconnectTimer = setTimeout(() => {
        if (navigator.onLine) setSocketDisconnected(true);
      }, GRACE_MS);
    };

    const unsubDisconnect = socketService.on('disconnect', scheduleShow);
    const unsubConnectError = socketService.on('connect_error', scheduleShow);

    const unsubConnect = socketService.on('connect', () => {
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
      setSocketDisconnected(false);
    });

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      unsubDisconnect();
      unsubConnectError();
      unsubConnect();
    };
  }, []);

  // בסביבת לא-פרודקשן: לא מציגים ספינר על socket בלבד (השרת מאותחל לאט)
  const isNonProd = !import.meta.env.PROD;
  const shouldShow = deviceOnline && (fetchErrorConfirmed || (!isNonProd && socketDisconnected));

  if (!shouldShow) return null;

  // אייקון בלבד, בלי מיקום קבוע/רקע - מוצג inline ליד פעמון ההתראות
  // (HomeHeader), לא כ-overlay צף על המסך. לבן ובגודל התואם את שאר אייקוני
  // הכותרת (בקשה מפורשת - לא רקע שחור/כתום, לא floating position:fixed).
  return (
    <WifiFadeIcon style={{ fontSize: 24, color: 'white', flexShrink: 0 }} />
  );
};
