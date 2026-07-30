import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useSettings } from '../context/SettingsContext';
import { socketService } from '../../services/socket/socket.service';

interface Props {
  visible: boolean;
}

const GRACE_MS = 4000;
// כמה זמן להציג את חיווי ה"מתחבר..." הראשוני לפני שהוא נעלם מאליו
// (אם ה-socket מתחבר - הוא נעלם מיד; אם לא התחבר עד אז, הבאנר הרגיל יטפל בזה)
const STARTUP_INDICATOR_MAX_MS = 8000;

export const ServerConnectionBanner = ({ visible }: Props) => {
  const { t } = useSettings();
  const [deviceOnline, setDeviceOnline] = useState(navigator.onLine);
  const [socketDisconnected, setSocketDisconnected] = useState(false);
  const [fetchErrorConfirmed, setFetchErrorConfirmed] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  // חיווי הפעלה ראשונה: מוצג בעדינות בתחתית המסך לפני חיבור ראשוני
  const [showStartupIndicator, setShowStartupIndicator] = useState(true);

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
      setShowStartupIndicator(false); // חיבור הצליח - מסתיר חיווי הפעלה
    });

    // חיווי הפעלה: נעלם אוטומטית אחרי STARTUP_INDICATOR_MAX_MS
    const startupTimer = setTimeout(() => setShowStartupIndicator(false), STARTUP_INDICATOR_MAX_MS);

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      clearTimeout(startupTimer);
      unsubDisconnect();
      unsubConnectError();
      unsubConnect();
    };
  }, []);

  const isDev = import.meta.env.DEV;
  const shouldShowBanner = deviceOnline && (fetchErrorConfirmed || (!isDev && socketDisconnected));

  // חיווי הפעלה ראשונה - עדין, בתחתית, לא מפריע לתוכן.
  // מוצג רק: לפני חיבור ראשוני, בסביבת production בלבד, לא כשיש כבר באנר.
  // בסביבת dev: ה-server מאותחל לאט ולא רצוי להציג חיוויים מיותרים.
  const shouldShowStartup = !isDev && showStartupIndicator && !hasConnectedOnce && !shouldShowBanner && deviceOnline;

  if (!shouldShowBanner && !shouldShowStartup) return null;

  if (shouldShowBanner) {
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
  }

  // חיווי הפעלה ראשונה - קטן ועדין
  return (
    <Box sx={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 900,
      display: 'flex', alignItems: 'center', gap: 0.75,
      px: 1.5, py: 0.6,
      borderRadius: '999px',
      bgcolor: 'rgba(20,184,166,0.12)',
      border: '1px solid rgba(20,184,166,0.25)',
      backdropFilter: 'blur(8px)',
      pointerEvents: 'none',
      animation: 'fadeInStartup 0.5s ease',
      '@keyframes fadeInStartup': {
        from: { opacity: 0, transform: 'translateX(-50%) translateY(8px)' },
        to: { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
      },
    }}>
      <CircularProgress size={10} sx={{ color: '#0D9488' }} />
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0D9488', whiteSpace: 'nowrap' }}>
        מתחבר לשירותי הרקע...
      </Typography>
    </Box>
  );
};
