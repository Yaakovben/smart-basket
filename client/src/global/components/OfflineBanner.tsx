import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useSettings } from '../context/SettingsContext';
import { subscribeToQueueCount } from '../../services/offlineQueue';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

// שלושה שלבים: online (כלום) → trying (גלולה עדינה עד 8ש') → offline (באנר מלא)
type Phase = 'online' | 'trying' | 'offline';

const OFFLINE_CONFIRM_MS = 8000;

export const OfflineBanner = () => {
  const { t } = useSettings();
  const [phase, setPhase] = useState<Phase>(() => navigator.onLine ? 'online' : 'offline');
  const [pendingCount, setPendingCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    const handleOffline = () => {
      setPhase('trying');
      clearTimer();
      timerRef.current = setTimeout(() => setPhase('offline'), OFFLINE_CONFIRM_MS);
    };

    const handleOnline = () => {
      clearTimer();
      setPhase('online');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // אתחול: אם כבר אופליין מהתחלה - הפעל טיימר מיד
    if (!navigator.onLine) {
      setPhase('trying');
      timerRef.current = setTimeout(() => setPhase('offline'), OFFLINE_CONFIRM_MS);
    }

    return () => {
      clearTimer();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => subscribeToQueueCount(setPendingCount), []);

  if (phase === 'online') return null;

  if (phase === 'trying') {
    return (
      <Box sx={{
        position: 'fixed',
        top: 'max(env(safe-area-inset-top), 8px)',
        insetInlineEnd: 10,
        zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 0.6,
        bgcolor: 'rgba(0,0,0,0.52)',
        backdropFilter: 'blur(6px)',
        borderRadius: '999px',
        py: 0.5, px: 1.25,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        animation: 'sbFadeIn 0.3s ease',
        '@keyframes sbFadeIn': { from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'none' } },
      }}>
        <WifiFadeIcon style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
        <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: 500, lineHeight: 1.3 }}>
          {t('connectingMessage')}
        </Typography>
      </Box>
    );
  }

  // שלב offline מלא
  return (
    <Box sx={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      bgcolor: '#EF4444',
      pt: 'max(env(safe-area-inset-top), 6px)',
      pb: '6px', px: 2,
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      animation: 'sbSlideDown 0.35s ease',
      '@keyframes sbSlideDown': { from: { transform: 'translateY(-100%)' }, to: { transform: 'none' } },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
        <WifiFadeIcon style={{ fontSize: 18, flexShrink: 0, color: 'white' }} />
        <Typography sx={{ color: 'white', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
          {t('offlineMessage')}
          {pendingCount > 0 && (
            <Box component="span" sx={{ opacity: 0.85 }}>
              {' '}· {pendingCount} {t('offlinePendingSync')}
            </Box>
          )}
        </Typography>
      </Box>
    </Box>
  );
};
