import { Box, Typography, Button } from '@mui/material';
import { useSettings } from '../context/SettingsContext';

interface UpdateBannerProps {
  show: boolean;
  onUpdate: () => void;
}

export const UpdateBanner = ({ show, onUpdate }: UpdateBannerProps) => {
  const { settings } = useSettings();

  if (!show) return null;

  const text = settings.language === 'he'
    ? 'עדכון זמין'
    : settings.language === 'ru'
      ? 'Доступно обновление'
      : 'Update available';

  const buttonText = settings.language === 'he'
    ? 'עדכן עכשיו'
    : settings.language === 'ru'
      ? 'Обновить'
      : 'Update now';

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        animation: 'slideUp 0.3s ease-out',
        '@keyframes slideUp': {
          from: { transform: 'translateX(-50%) translateY(100px)', opacity: 0 },
          to: { transform: 'translateX(-50%) translateY(0)', opacity: 1 }
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2.5,
          py: 1.5,
          bgcolor: 'primary.main',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(20, 184, 166, 0.4)',
        }}
      >
        <Box sx={{ fontSize: 18 }}>✨</Box>
        <Typography sx={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
          {text}
        </Typography>
        <Button
          onClick={onUpdate}
          sx={{
            bgcolor: 'white',
            color: 'primary.main',
            fontSize: 13,
            fontWeight: 700,
            px: 2,
            py: 0.75,
            borderRadius: '10px',
            minWidth: 'auto',
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
          }}
        >
          {buttonText}
        </Button>
      </Box>
    </Box>
  );
};
