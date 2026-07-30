import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useSettings } from '../context/SettingsContext';
import { socketService } from '../../services/socket/socket.service';

interface Props {
  visible: boolean;
}

const GRACE_MS = 4000;

// באנר עליון יחיד - "אין חיבור לשרת".
// מוצג כשה-caller מדווח על fetch שנכשל, או כשה-socket מנותק בזמן אמת.
// בסביבת DEV: רק שגיאות fetch אמיתיות - לא ספינר על המתנה לsocket.
export const ServerConnectionBanner = ({ visible }: Props) => {
  const { t } = useSettings();
  const [deviceOnline, setDeviceOnline] = useState(navigator.onLine);
  const [socketDisconnected, setSocketDisconnected] = useState(false);
  const [fetchErrorConfirmed, setFetchErrorConfirmed] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

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
      setHasConnectedOnce(true);
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

  return (
    <Box sx={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      bgcolor: '#F59E0B',
      pt: 'max(env(safe-area-inset-top), 6px)',
      pb: '6px', px: 2,
      textAlign: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <CircularProgress size={12} sx={{ color: 'white' }} />
      <Typography sx={{ color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
        {socketDisconnected && !fetchErrorConfirmed
          ? (hasConnectedOnce ? t('reconnectingMessage') : t('connectingMessage'))
          : t('serverUnreachableMessage')}
      </Typography>
    </Box>
  );
};
