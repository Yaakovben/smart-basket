import { Snackbar, Box, Typography } from '@mui/material';
import type { ToastType } from '../types';

interface ToastProps {
  msg: string;
  type?: ToastType;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; bg: string; color: string }> = {
  success: { icon: '✓', bg: 'rgba(34, 197, 94, 0.95)', color: 'white' },
  error: { icon: '✕', bg: 'rgba(239, 68, 68, 0.95)', color: 'white' },
  info: { icon: 'ℹ', bg: 'rgba(59, 130, 246, 0.95)', color: 'white' },
  warning: { icon: '⚠', bg: 'rgba(245, 158, 11, 0.95)', color: 'white' }
};

export const Toast = ({ msg, type = 'success' }: ToastProps) => {
  if (!msg) return null;
  const config = TOAST_CONFIG[type];

  return (
    <Snackbar
      open={!!msg}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        top: 'max(16px, env(safe-area-inset-top))',
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)'
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          bgcolor: config.bg,
          color: config.color,
          borderRadius: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(8px)',
          animation: 'slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@keyframes slideDown': {
            from: { transform: 'translateY(-100%)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 }
          }
        }}
      >
        <Box sx={{ fontSize: 16, fontWeight: 700 }}>{config.icon}</Box>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{msg}</Typography>
      </Box>
    </Snackbar>
  );
};
