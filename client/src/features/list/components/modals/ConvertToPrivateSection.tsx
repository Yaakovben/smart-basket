import { memo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== המרת קבוצה ריקה לרשימה פרטית =====
interface ConvertToPrivateSectionProps {
  onConvertToPrivate: () => void | Promise<void>;
}

export const ConvertToPrivateSection = memo(({ onConvertToPrivate }: ConvertToPrivateSectionProps) => {
  const { t } = useSettings();
  const [converting, setConverting] = useState(false);

  return (
    <Box
      onClick={async () => {
        setConverting(true);
        try {
          await onConvertToPrivate();
        } finally {
          setConverting(false);
        }
      }}
      sx={{
        mt: 2.5,
        p: 1.5,
        borderRadius: '12px',
        bgcolor: 'rgba(99, 102, 241, 0.06)',
        border: '1.5px dashed',
        borderColor: 'rgba(99, 102, 241, 0.3)',
        cursor: converting ? 'default' : 'pointer',
        opacity: converting ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        transition: 'all 0.15s ease',
        '&:active': { transform: 'scale(0.98)', bgcolor: 'rgba(99, 102, 241, 0.12)' }
      }}
    >
      <Box sx={{
        width: 36,
        height: 36,
        borderRadius: '10px',
        bgcolor: 'rgba(99, 102, 241, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0
      }}>
        📝
      </Box>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#6366F1', lineHeight: 1.3 }}>
          {t('convertToPrivate')}
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.3 }}>
          {t('convertToPrivateHint')}
        </Typography>
      </Box>
    </Box>
  );
});

ConvertToPrivateSection.displayName = 'ConvertToPrivateSection';
