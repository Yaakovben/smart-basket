import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useSettings } from '../context/SettingsContext';

export const OfflineBanner = () => {
  const { t } = useSettings();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    let offlineTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOffline = () => {
      offlineTimer = setTimeout(() => setIsOffline(true), 2000);
    };
    const handleOnline = () => {
      if (offlineTimer) { clearTimeout(offlineTimer); offlineTimer = null; }
      setIsOffline(false);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      if (offlineTimer) clearTimeout(offlineTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      bgcolor: '#EF4444',
      pt: 'max(env(safe-area-inset-top), 6px)',
      pb: '6px',
      px: 2,
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <Typography sx={{
        color: 'white',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
      }}>
        📡 {t('offlineMessage')}
      </Typography>
    </Box>
  );
};
