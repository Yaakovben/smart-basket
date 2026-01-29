import { Snackbar, Box, Typography } from '@mui/material';
import type { ToastType } from '../types';

interface ToastProps {
  msg: string;
  type?: ToastType;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string }> = {
  success: { icon: '✓', color: '#059669' },
  error: { icon: '✕', color: '#DC2626' },
  info: { icon: 'i', color: '#2563EB' },
  warning: { icon: '!', color: '#D97706' }
};

export const Toast = ({ msg, type = 'success' }: ToastProps) => {
  if (!msg) return null;
  const config = TOAST_CONFIG[type];

  return (
    <Snackbar
      open={!!msg}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        top: 'max(20px, env(safe-area-inset-top))',
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
          py: 1,
          bgcolor: 'rgba(255,255,255,0.95)',
          borderRadius: '100px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.2s ease-out',
          '@keyframes fadeIn': {
            from: { transform: 'scale(0.95)', opacity: 0 },
            to: { transform: 'scale(1)', opacity: 1 }
          }
        }}
      >
        <Box sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          bgcolor: `${config.color}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0
        }}>
          {config.icon}
        </Box>
        <Typography sx={{
          fontSize: 13,
          fontWeight: 500,
          color: '#374151',
          whiteSpace: 'nowrap'
        }}>
          {msg}
        </Typography>
      </Box>
    </Snackbar>
  );
};
