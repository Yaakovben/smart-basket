import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useSettings } from '../context/SettingsContext';
import { socketService } from '../../services/socket/socket.service';

export const ReconnectingBanner = () => {
  const { t } = useSettings();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // מציג באנר רק אחרי 3 שניות של ניתוק (מונע הבזקים קצרים)
    const unsubDisconnect = socketService.on('disconnect', () => {
      disconnectTimer = setTimeout(() => {
        // מציג רק כשיש אינטרנט אבל הסוקט מנותק
        if (navigator.onLine) {
          setShowBanner(true);
        }
      }, 3000);
    });

    const unsubConnect = socketService.on('connect', () => {
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
      setShowBanner(false);
    });

    // מסתיר כשאין אינטרנט (OfflineBanner מטפל בזה)
    const handleOffline = () => {
      if (disconnectTimer) { clearTimeout(disconnectTimer); disconnectTimer = null; }
      setShowBanner(false);
    };

    window.addEventListener('offline', handleOffline);

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer);
      unsubDisconnect();
      unsubConnect();
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9998,
      bgcolor: '#F59E0B',
      pt: 'max(env(safe-area-inset-top), 6px)',
      pb: '6px',
      px: 2,
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    }}>
      <CircularProgress size={12} sx={{ color: 'white' }} />
      <Typography sx={{
        color: 'white',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.4,
      }}>
        {t('reconnectingMessage')}
      </Typography>
    </Box>
  );
};
