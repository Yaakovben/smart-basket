import { memo, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { settingsRowSx, iconBadgeSx } from './listSettingsCardSx';

// ===== המרת קבוצה ריקה לרשימה פרטית =====
interface ConvertToPrivateSectionProps {
  onConvertToPrivate: () => void | Promise<void>;
}

export const ConvertToPrivateSection = memo(({ onConvertToPrivate }: ConvertToPrivateSectionProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [converting, setConverting] = useState(false);

  return (
    <Box
      onClick={async () => {
        if (converting) return;
        setConverting(true);
        try {
          await onConvertToPrivate();
        } finally {
          setConverting(false);
        }
      }}
      sx={settingsRowSx(converting)}
    >
      <Box sx={iconBadgeSx('neutral', isDark)}>
        <LockRoundedIcon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
          {t('convertToPrivate')}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.3 }}>
          {t('convertToPrivateHint')}
        </Typography>
      </Box>
      {converting && <CircularProgress size={16} sx={{ color: 'text.secondary', flexShrink: 0 }} />}
    </Box>
  );
});

ConvertToPrivateSection.displayName = 'ConvertToPrivateSection';
