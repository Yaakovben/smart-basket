import { memo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx } from './listSettingsCardSx';

interface ConvertToPrivateSectionProps {
  onClick: () => void;
}

// שורת הגדרה לחיצה ישירה - בלי הרחבה/טקסט קבוע במסך. כל האזהרה (בין אם
// "צריך להסיר חברים קודם" ובין אם אישור ההמרה בפועל) מוצגת כ-popup בלבד,
// מוחלט ע"י ListComponent לפי מספר החברים ברגע הלחיצה.
export const ConvertToPrivateSection = memo(({ onClick }: ConvertToPrivateSectionProps) => {
  const { t } = useSettings();

  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2.5, mb: 1, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={settingsRowSx} onClick={onClick}>
        <Box component="span" sx={{ fontSize: 22 }}>🔒</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('convertToPrivate')}</Typography>
          <Typography sx={rowHintSx}>{t('convertToPrivateHint')}</Typography>
        </Box>
      </Box>
    </Paper>
  );
});

ConvertToPrivateSection.displayName = 'ConvertToPrivateSection';
