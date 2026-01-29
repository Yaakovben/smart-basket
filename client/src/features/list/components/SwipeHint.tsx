import { memo } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSettings } from '../../../global/context/SettingsContext';

// ===== Props =====
interface SwipeHintProps {
  onDismiss: () => void;
}

// ===== Component =====
export const SwipeHint = memo(({ onDismiss }: SwipeHintProps) => {
  const { t } = useSettings();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: '12px 16px',
        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
        borderRadius: '14px',
        mb: 1.5,
        border: '1px solid',
        borderColor: 'rgba(20, 184, 166, 0.25)',
        boxShadow: '0 2px 8px rgba(20, 184, 166, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}
      role="status"
      aria-live="polite"
    >
      {/* Decorative gradient accent */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 80,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.08))',
          pointerEvents: 'none'
        }}
      />

      {/* Tip icon with background */}
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          bgcolor: 'rgba(20, 184, 166, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Typography sx={{ fontSize: 18, lineHeight: 1 }} role="img" aria-label="tip">
          💡
        </Typography>
      </Box>

      {/* Hint text */}
      <Typography
        sx={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: 'primary.dark',
          lineHeight: 1.4
        }}
      >
        {t('swipeHint')}
      </Typography>

      {/* Close button */}
      <IconButton
        size="small"
        onClick={onDismiss}
        sx={{
          color: 'primary.main',
          bgcolor: 'rgba(20, 184, 166, 0.1)',
          width: 28,
          height: 28,
          '&:hover': {
            bgcolor: 'rgba(20, 184, 166, 0.2)'
          }
        }}
        aria-label={t('close')}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
});

SwipeHint.displayName = 'SwipeHint';
