import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { subscribeToQueueCount } from '../../services/offlineQueue';
import { socketService } from '../../services/socket/socket.service';
import { useSettings } from '../context/SettingsContext';
import { haptic } from '../helpers';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

// ארבעה שלבים: online (כלום) → trying (גלולה עדינה עד 8ש') → offline
// (באנר מלא, אין אינטרנט למכשיר) → reconnecting (גלולה כתומה - יש אינטרנט
// למכשיר אבל ה-socket לשרת מנותק, קורה בכל מסך באפליקציה, לא רק ברשימות).
type Phase = 'online' | 'trying' | 'offline' | 'reconnecting';

const OFFLINE_CONFIRM_MS = 8000;
const SOCKET_GRACE_MS = 4000;
const TAP_LABEL_MS = 3000;

export const OfflineBanner = () => {
  const { t } = useSettings();
  const [phase, setPhase] = useState<Phase>(() => navigator.onLine ? 'online' : 'offline');
  const [pendingCount, setPendingCount] = useState(0);
  const [showLabel, setShowLabel] = useState(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => () => { if (labelTimerRef.current) clearTimeout(labelTimerRef.current); }, []);

  const handleTap = () => {
    haptic('light');
    setShowLabel(true);
    if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    labelTimerRef.current = setTimeout(() => setShowLabel(false), TAP_LABEL_MS);
  };

  if (phase === 'online') return null;

  if (phase === 'trying' || phase === 'reconnecting') {
    const isReconnecting = phase === 'reconnecting';
    const label = isReconnecting ? t('reconnectingMessage') : t('serverUnreachableMessage');
    return (
      <Box
        onClick={handleTap}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); } }}
        sx={{
          position: 'fixed',
          // ברצועת ה-status bar, מעל כרטיס הכותרת עצמו - מיקום קבוע וזהה בכל
          // עמוד (גם בעמודים בלי פעמון בפועל, כמו רשימה/תובנות), קרוב אופקית
          // לאשכול הפעמון/הגדרות בלי לשבת ממש עליהם ולחסום טאפ על האייקונים
          // האמיתיים של הכותרת.
          top: 'max(env(safe-area-inset-top), 8px)',
          insetInlineEnd: 54,
          zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 0.75,
          height: 26,
          minWidth: 26,
          px: showLabel ? 1.25 : 0,
          justifyContent: 'center',
          bgcolor: isReconnecting ? 'rgba(217,119,6,0.92)' : 'rgba(0,0,0,0.52)',
          backdropFilter: 'blur(6px)',
          borderRadius: '999px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          cursor: 'pointer',
          animation: 'sbFadeIn 0.3s ease',
          transition: 'padding 0.18s ease, background-color 0.18s ease',
          WebkitTapHighlightColor: 'transparent',
          '@keyframes sbFadeIn': { from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'none' } },
        }}
      >
        <WifiFadeIcon style={{ fontSize: 13, color: 'rgba(255,255,255,0.95)', flexShrink: 0 }} />
        {showLabel && (
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
            {label}
          </Typography>
        )}
      </Box>
    );
  }

  // שלב offline מלא - יש אפשרות ללחוץ כדי לראות טקסט הסבר. ספירת הפעולות
  // הממתינות (מידע שימושי, לא רק דקורטיבי) נשמרת כתג מספרי קטן על האייקון.
  return (
    <Box
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); } }}
      sx={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        bgcolor: '#EF4444',
        pt: 'max(env(safe-area-inset-top), 6px)',
        pb: '6px', px: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        animation: 'sbSlideDown 0.35s ease',
        WebkitTapHighlightColor: 'transparent',
        '@keyframes sbSlideDown': { from: { transform: 'translateY(-100%)' }, to: { transform: 'none' } },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex' }}>
        <WifiFadeIcon style={{ fontSize: 20, flexShrink: 0, color: 'white' }} />
        {pendingCount > 0 && (
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
      {showLabel && (
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
          {pendingCount > 0 ? `${t('offlineMessage')} · ${t('offlinePendingSync')}` : t('offlineMessage')}
        </Typography>
      )}
    </Box>
  );
};
