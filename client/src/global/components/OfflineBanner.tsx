import { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { subscribeToQueueCount } from '../../services/offlineQueue';
import { WifiFadeIcon } from './icons/WifiFadeIcon';

// שלושה שלבים: online (כלום) → trying (גלולה עדינה עד 8ש') → offline (באנר מלא)
type Phase = 'online' | 'trying' | 'offline';

const OFFLINE_CONFIRM_MS = 8000;

export const OfflineBanner = () => {
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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30,
        bgcolor: 'rgba(0,0,0,0.52)',
        backdropFilter: 'blur(6px)',
        borderRadius: '999px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        animation: 'sbFadeIn 0.3s ease',
        '@keyframes sbFadeIn': { from: { opacity: 0, transform: 'translateY(-6px)' }, to: { opacity: 1, transform: 'none' } },
      }}>
        <WifiFadeIcon style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', flexShrink: 0 }} />
      </Box>
    );
  }

  // שלב offline מלא - אייקון בלבד, בלי טקסט (כמו שאר באנרי החיבור). ספירת
  // הפעולות הממתינות (מידע שימושי, לא רק דקורטיבי) נשמרת כתג מספרי קטן על
  // האייקון במקום להיעלם לגמרי עם הטקסט.
  return (
    <Box sx={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      bgcolor: '#EF4444',
      pt: 'max(env(safe-area-inset-top), 6px)',
      pb: '6px', px: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      animation: 'sbSlideDown 0.35s ease',
      '@keyframes sbSlideDown': { from: { transform: 'translateY(-100%)' }, to: { transform: 'none' } },
    }}>
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
    </Box>
  );
};
