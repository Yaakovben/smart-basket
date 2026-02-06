import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface CleanupStep {
  id: string;
  label: string;
  labelHe: string;
  status: StepStatus;
  error?: string;
}

export const ClearCachePage = () => {
  const [steps, setSteps] = useState<CleanupStep[]>([
    { id: 'sw', label: 'Unregistering Service Workers', labelHe: 'מבטל רישום Service Workers', status: 'pending' },
    { id: 'caches', label: 'Clearing browser caches', labelHe: 'מנקה מטמון דפדפן', status: 'pending' },
    { id: 'storage', label: 'Clearing local storage', labelHe: 'מנקה אחסון מקומי', status: 'pending' },
    { id: 'session', label: 'Clearing session storage', labelHe: 'מנקה אחסון סשן', status: 'pending' },
    { id: 'cookies', label: 'Clearing app cookies', labelHe: 'מנקה עוגיות', status: 'pending' },
  ]);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const updateStep = (id: string, status: StepStatus, error?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, error } : s));
  };

  useEffect(() => {
    const runCleanup = async () => {
      // Step 1: Unregister Service Workers
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

      // Step 2: Clear Caches API
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

      // Step 3: Clear localStorage
      updateStep('storage', 'running');
      try {
        localStorage.clear();
        updateStep('storage', 'success');
      } catch (e) {
        updateStep('storage', 'error', String(e));
      }

      // Step 4: Clear sessionStorage
      updateStep('session', 'running');
      try {
        sessionStorage.clear();
        updateStep('session', 'success');
      } catch (e) {
        updateStep('session', 'error', String(e));
      }

      // Step 5: Clear cookies (app-related)
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

  // Countdown and redirect
  useEffect(() => {
    if (!done) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Force reload to root (bypassing any cache)
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
        return <CircularProgress size={24} />;
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
      background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
      p: 2
    }}>
      <Paper sx={{
        p: 4,
        maxWidth: 400,
        width: '100%',
        borderRadius: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>
          Smart Basket
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, color: 'text.secondary' }}>
          {done ? 'Cleanup Complete! / הניקוי הושלם!' : 'Cleaning Cache... / מנקה מטמון...'}
        </Typography>

        <List dense>
          {steps.map(step => (
            <ListItem key={step.id} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                {getStepIcon(step.status)}
              </ListItemIcon>
              <ListItemText
                primary={step.labelHe}
                secondary={step.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
            </ListItem>
          ))}
        </List>

        {done && (
          <Box sx={{ mt: 3 }}>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Redirecting in {countdown}... / מעביר בעוד {countdown}...
            </Typography>
            <CircularProgress size={20} sx={{ mt: 1 }} />
          </Box>
        )}
      </Paper>
    </Box>
  );
};
