import { Snackbar, Box, Typography } from '@mui/material';
import type { ToastType } from '../types';

interface ToastProps {
  msg: string;
  type?: ToastType;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; bg: string }> = {
  success: { icon: '✓', color: '#059669', bg: '#ECFDF5' },
  error: { icon: '✕', color: '#DC2626', bg: '#FEF2F2' },
  info: { icon: 'i', color: '#2563EB', bg: '#EFF6FF' },
  warning: { icon: '!', color: '#D97706', bg: '#FFFBEB' }
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
          gap: 1.25,
          px: 2.5,
          py: 1.25,
          bgcolor: config.bg,
          borderRadius: '16px',
          border: `1.5px solid ${config.color}20`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          animation: 'slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@keyframes slideDown': {
            from: { transform: 'translateY(-20px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 }
          }
        }}
      >
        <Box sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: `${config.color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0
        }}>
          {config.icon}
        </Box>
        <Typography sx={{
          fontSize: 14,
          fontWeight: 600,
          color: config.color,
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em'
        }}>
          {msg}
        </Typography>
      </Box>
    </Snackbar>
  );
};
