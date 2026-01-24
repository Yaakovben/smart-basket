import { Snackbar, Alert, Box } from '@mui/material';
import type { ToastType } from '../types';

interface ToastProps {
  msg: string;
  type?: ToastType;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠'
};

export const Toast = ({ msg, type = 'success' }: ToastProps) => {
  if (!msg) return null;

  return (
    <Snackbar
      open={!!msg}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      sx={{ bottom: 24, left: 20, maxWidth: 'calc(100vw - 40px)' }}
    >
      <Alert
        severity={type}
        icon={<Box component="span" sx={{ fontSize: 18 }}>{TOAST_ICONS[type]}</Box>}
        sx={{
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: 14,
          animation: 'slideInLeft 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@keyframes slideInLeft': {
            from: { transform: 'translateX(-100%)', opacity: 0 },
            to: { transform: 'translateX(0)', opacity: 1 }
          }
        }}
      >
        {msg}
      </Alert>
    </Snackbar>
  );
};
