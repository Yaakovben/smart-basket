import { memo, useState } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, accentBarSx } from './listSettingsCardSx';

// ===== המרת קבוצה ריקה לרשימה פרטית =====
interface ConvertToPrivateSectionProps {
  onConvertToPrivate: () => void | Promise<void>;
}

export const ConvertToPrivateSection = memo(({ onConvertToPrivate }: ConvertToPrivateSectionProps) => {
  const { t } = useSettings();
  const [converting, setConverting] = useState(false);

  return (
    <Paper sx={{ ...accentBarSx('neutral'), borderRadius: '16px', overflow: 'hidden', mt: 2.5 }}>
      <Box
        sx={{ ...settingsRowSx, opacity: converting ? 0.6 : 1, cursor: converting ? 'default' : 'pointer' }}
        onClick={async () => {
          if (converting) return;
          setConverting(true);
          try {
            await onConvertToPrivate();
          } finally {
            setConverting(false);
          }
        }}
      >
        <Box component="span" sx={{ fontSize: 22 }}>🔒</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('convertToPrivate')}</Typography>
          <Typography sx={rowHintSx}>{t('convertToPrivateHint')}</Typography>
        </Box>
        {converting && <CircularProgress size={18} sx={{ color: 'text.secondary', flexShrink: 0 }} />}
      </Box>
    </Paper>
  );
});

ConvertToPrivateSection.displayName = 'ConvertToPrivateSection';
