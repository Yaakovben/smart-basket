import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { subscribeToQueueCount } from '../../services/offlineQueue';
import { socketService } from '../../services/socket/socket.service';
import { useSettings } from '../context/SettingsContext';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

// ארבעה שלבים: online (כלום) → trying (עד 8ש', עדיין ייתכן שזה זמני) →
// offline (אין אינטרנט למכשיר) → reconnecting (יש אינטרנט למכשיר אבל
// ה-socket לשרת מנותק, קורה בכל מסך באפליקציה, לא רק ברשימות).
// שלושתם (trying/offline/reconnecting) מוצגים באותו פס עליון קבוע במידות
// ובמיקום זהים בכל עמוד - רק הצבע/טקסט משתנים - כדי שהחיווי לא "יקפוץ"
// בין מקומות שונים בכותרות שונות בכל עמוד.
type Phase = 'online' | 'trying' | 'offline' | 'reconnecting';

const OFFLINE_CONFIRM_MS = 8000;
const SOCKET_GRACE_MS = 4000;

export const OfflineBanner = () => {
  const { t } = useSettings();
  const [phase, setPhase] = useState<Phase>(() => navigator.onLine ? 'online' : 'offline');
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

    // אתחול: אם כבר אופליין מהתחלה - הפעל טיימר מיד
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

  // ניתור חיבור ה-socket לשרת - גלובלי, לא רק במסך הבית. אם המכשיר מחובר
  // לאינטרנט אבל ה-socket מנותק (אחרי grace period), זו בעיית חיבור לשרת
  // שרלוונטית בכל מסך באפליקציה (הודעות בזמן אמת, סנכרון וכו').
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

  if (phase === 'online') return null;

  const config = {
    trying: { bgcolor: '#475569', label: t('serverUnreachableMessage') },
    offline: {
      bgcolor: '#EF4444',
      label: pendingCount > 0 ? `${t('offlineMessage')} · ${t('offlinePendingSync')}` : t('offlineMessage'),
    },
    reconnecting: { bgcolor: '#D97706', label: t('reconnectingMessage') },
  }[phase];

  // פס עליון קבוע, רוחב מלא, מיקום וגובה זהים תמיד - מציג את שלושת
  // השלבים באותה צורה בדיוק (רק צבע/טקסט משתנים) כדי שהחיווי לא "יקפוץ"
  // בין מקומות שונים בכותרות שונות של כל עמוד.
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        bgcolor: config.bgcolor,
        pt: 'max(env(safe-area-inset-top), 6px)',
        pb: '6px', px: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        animation: 'sbSlideDown 0.35s ease',
        transition: 'background-color 0.2s ease',
        '@keyframes sbSlideDown': { from: { transform: 'translateY(-100%)' }, to: { transform: 'none' } },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex' }}>
        <WifiFadeIcon style={{ fontSize: 16, flexShrink: 0, color: 'white' }} />
        {phase === 'offline' && pendingCount > 0 && (
          <Box sx={{
            position: 'absolute', top: -6, insetInlineEnd: -8,
            minWidth: 14, height: 14, px: '3px',
            borderRadius: '999px',
            bgcolor: 'white', color: '#EF4444',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {pendingCount > 99 ? '99+' : pendingCount}
          </Box>
        )}
      </Box>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
        {config.label}
      </Typography>
    </Box>
  );
};
