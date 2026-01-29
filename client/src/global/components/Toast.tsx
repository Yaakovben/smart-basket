import { Snackbar, Box, Typography } from '@mui/material';
import type { ToastType } from '../types';

interface ToastProps {
  msg: string;
  type?: ToastType;
}

const TOAST_CONFIG: Record<ToastType, { accent: string; text: string }> = {
  success: { accent: '#10B981', text: 'text.primary' },
  error: { accent: '#EF4444', text: 'text.primary' },
  info: { accent: '#3B82F6', text: 'text.primary' },
  warning: { accent: '#F59E0B', text: 'text.primary' }
};

export const Toast = ({ msg, type = 'success' }: ToastProps) => {
  if (!msg) return null;
  const config = TOAST_CONFIG[type];

  return (
    <Snackbar
      open={!!msg}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        top: 'max(12px, env(safe-area-inset-top))',
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
          gap: 1.5,
          pl: 0,
          pr: 2.5,
          py: 1,
          bgcolor: 'background.paper',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          animation: 'floatIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          '@keyframes floatIn': {
            from: { transform: 'translateY(-20px) scale(0.95)', opacity: 0 },
            to: { transform: 'translateY(0) scale(1)', opacity: 1 }
          }
        }}
      >
        {/* Accent line */}
        <Box
          sx={{
            width: 4,
            alignSelf: 'stretch',
            bgcolor: config.accent,
            borderRadius: '4px 0 0 4px'
          }}
        />
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: config.text, py: 0.5 }}>
          {msg}
        </Typography>
      </Box>
    </Snackbar>
  );
};
