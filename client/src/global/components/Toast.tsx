import { Snackbar, Box, Typography } from '@mui/material';
import type { ToastType } from '../types';

interface ToastProps {
  msg: string;
  type?: ToastType;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; bg: string }> = {
  success: { icon: '✓', color: '#059669', bg: '#ECFDF5' },
  error: { icon: '✕', color: '#DC2626', bg: '#FEF2F2' },
  info: { icon: '🔔', color: '#0891B2', bg: '#ECFEFF' },
  warning: { icon: '⚠', color: '#D97706', bg: '#FFFBEB' }
};

export const Toast = ({ msg, type = 'success' }: ToastProps) => {
  if (!msg) return null;
  const config = TOAST_CONFIG[type];
  const isLongText = msg.length > 40;

  return (
    <Snackbar
      open={!!msg}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        top: 'max(20px, env(safe-area-inset-top))',
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        maxWidth: 'calc(100vw - 32px)'
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
          border: `1.5px solid ${config.color}30`,
          boxShadow: `0 4px 20px ${config.color}20`,
          animation: 'slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@keyframes slideDown': {
            from: { transform: 'translateY(-20px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 }
          },
          maxWidth: isLongText ? 320 : 'none'
        }}
      >
        <Box sx={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          bgcolor: `${config.color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          fontSize: type === 'info' ? 14 : 13,
          fontWeight: 700,
          flexShrink: 0
        }}>
          {config.icon}
        </Box>
        <Typography sx={{
          fontSize: isLongText ? 13 : 14,
          fontWeight: 600,
          color: config.color,
          whiteSpace: isLongText ? 'normal' : 'nowrap',
          letterSpacing: '-0.01em',
          lineHeight: 1.4
        }}>
          {msg}
        </Typography>
      </Box>
    </Snackbar>
  );
};
