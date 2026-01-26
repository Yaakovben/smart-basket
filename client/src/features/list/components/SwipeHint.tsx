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
        gap: { xs: 1.25, sm: 1.5 },
        p: { xs: '10px 14px', sm: '12px 16px' },
        bgcolor: 'action.hover',
        borderRadius: { xs: '10px', sm: '12px' },
        mb: { xs: 1.25, sm: 1.5 },
        border: '1px solid',
        borderColor: 'divider'
      }}
      role="status"
      aria-live="polite"
    >
      <Typography sx={{ fontSize: { xs: 20, sm: 24 } }} role="img" aria-label="tip">
        💡
      </Typography>
      <Typography sx={{ flex: 1, fontSize: { xs: 12, sm: 13 }, color: 'text.secondary' }}>
        {t('swipeHint')}
      </Typography>
      <IconButton
        size="small"
        onClick={onDismiss}
        sx={{ color: 'primary.main' }}
        aria-label={t('close')}
      >
        <CloseIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
      </IconButton>
    </Box>
  );
});

SwipeHint.displayName = 'SwipeHint';
