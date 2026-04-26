import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CachedIcon from '@mui/icons-material/Cached';
import { useSettings } from '../../global/context/SettingsContext';

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface CleanupStep {
  id: string;
  labelKey: 'clearCacheStepSW' | 'clearCacheStepCaches' | 'clearCacheStepStorage' | 'clearCacheStepSession' | 'clearCacheStepCookies';
  status: StepStatus;
  error?: string;
}

export const ClearCachePage = () => {
  const { t } = useSettings();

  const [steps, setSteps] = useState<CleanupStep[]>([
    { id: 'sw', labelKey: 'clearCacheStepSW', status: 'pending' },
    { id: 'caches', labelKey: 'clearCacheStepCaches', status: 'pending' },
    { id: 'storage', labelKey: 'clearCacheStepStorage', status: 'pending' },
    { id: 'session', labelKey: 'clearCacheStepSession', status: 'pending' },
    { id: 'cookies', labelKey: 'clearCacheStepCookies', status: 'pending' },
  ]);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const updateStep = (id: string, status: StepStatus, error?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, error } : s));
  };

  useEffect(() => {
    const runCleanup = async () => {
      // ביטול רישום Service Workers
      updateStep('sw', 'running');
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }
        updateStep('sw', 'success');
      } catch (e) {
        updateStep('sw', 'error', String(e));
      }

      // ניקוי Caches API
      updateStep('caches', 'running');
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        updateStep('caches', 'success');
      } catch (e) {
        updateStep('caches', 'error', String(e));
      }

      // ניקוי localStorage (שימור טוקנים)
      updateStep('storage', 'running');
      try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        localStorage.clear();
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        updateStep('storage', 'success');
      } catch (e) {
        updateStep('storage', 'error', String(e));
      }

      // ניקוי sessionStorage
      updateStep('session', 'running');
      try {
        sessionStorage.clear();
        updateStep('session', 'success');
      } catch (e) {
        updateStep('session', 'error', String(e));
      }

      // ניקוי cookies
      updateStep('cookies', 'running');
      try {
        document.cookie.split(';').forEach(c => {
          const name = c.split('=')[0].trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
        updateStep('cookies', 'success');
      } catch (e) {
        updateStep('cookies', 'error', String(e));
      }

      setDone(true);
    };

    runCleanup();
  }, []);

  // ספירה לאחור והפניה
  useEffect(() => {
    if (!done) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // ריענון כפוי (עקיפת cache)
          window.location.href = '/?t=' + Date.now();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [done]);

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'pending':
        return <HourglassEmptyIcon sx={{ color: 'text.disabled' }} />;
      case 'running':
        return <CircularProgress size={24} sx={{ color: 'primary.main' }} />;
      case 'success':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
      p: 2
    }}>
      <Paper sx={{
        p: 4,
        maxWidth: 420,
        width: '100%',
        borderRadius: 4,
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(0,0,0,0.05)'
      }}>
        {/* Icon */}
        <Box sx={{
          width: 72,
          height: 72,
          background: 'linear-gradient(135deg, #14B8A6, #10B981)',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
          boxShadow: '0 8px 24px rgba(20, 184, 166, 0.3)'
        }}>
          <CachedIcon sx={{ fontSize: 36, color: 'white' }} />
        </Box>

        {/* Title */}
        <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700, color: 'text.primary' }}>
          {t('clearCacheTitle')}
        </Typography>

        {/* Subtitle */}
        <Typography sx={{ mb: 3, color: 'text.secondary', fontSize: 14 }}>
          {done ? t('clearCacheDone') : t('clearCacheSubtitle')}
        </Typography>

        {/* Steps List */}
        <List sx={{
          bgcolor: 'action.hover',
          borderRadius: 2,
          py: 1,
          mb: 2
        }}>
          {steps.map(step => (
            <ListItem key={step.id} sx={{ py: 0.75, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getStepIcon(step.status)}
              </ListItemIcon>
              <ListItemText
                primary={t(step.labelKey)}
                primaryTypographyProps={{
                  fontSize: 14,
                  fontWeight: step.status === 'running' ? 600 : 400,
                  color: step.status === 'success' ? 'success.main' :
                         step.status === 'error' ? 'error.main' : 'text.primary'
                }}
              />
            </ListItem>
          ))}
        </List>

        {/* Redirect countdown */}
        {done && (
          <Box sx={{
            mt: 2,
            p: 2,
            bgcolor: 'success.light',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5
          }}>
            <CircularProgress size={20} sx={{ color: 'success.main' }} />
            <Typography sx={{ fontSize: 14, color: 'success.dark', fontWeight: 500 }}>
              {t('clearCacheRedirect')} {countdown}...
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
