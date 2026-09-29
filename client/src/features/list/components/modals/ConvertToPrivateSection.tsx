import { memo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, rowLabelSx, rowHintSx, settingsCardSx, settingsIconBoxSx, SETTINGS_ACCENTS } from './listSettingsCardSx';

const ACCENT = SETTINGS_ACCENTS.private;

interface ConvertToPrivateSectionProps {
  onClick: () => void;
}

// שורת הגדרה לחיצה ישירה - בלי הרחבה/טקסט קבוע במסך. כל האזהרה (בין אם
// "צריך להסיר חברים קודם" ובין אם אישור ההמרה בפועל) מוצגת כ-popup בלבד,
// מוחלט ע"י ListComponent לפי מספר החברים ברגע הלחיצה.
export const ConvertToPrivateSection = memo(({ onClick }: ConvertToPrivateSectionProps) => {
  const { t } = useSettings();

  return (
    <Paper elevation={0} sx={settingsCardSx(ACCENT, false, 1)}>
      <Box sx={settingsRowSx} onClick={onClick}>
        <Box component="span" sx={settingsIconBoxSx(ACCENT)}>🔒</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={rowLabelSx}>{t('convertToPrivate')}</Typography>
          <Typography sx={rowHintSx}>{t('convertToPrivateHint')}</Typography>
        </Box>
      </Box>
    </Paper>
  );
});

ConvertToPrivateSection.displayName = 'ConvertToPrivateSection';
