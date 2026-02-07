import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useSettings } from '../context/SettingsContext';

export const OfflineBanner = () => {
  const { t } = useSettings();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
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
      py: 0.8,
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <Typography sx={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
        📡 {t('offlineMessage')}
      </Typography>
    </Box>
  );
};
