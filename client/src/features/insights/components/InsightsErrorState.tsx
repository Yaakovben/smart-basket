import { Box, Typography, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { float } from './insightsShared';

interface InsightsErrorStateProps {
  onBack: () => void;
  t: (key: string) => string;
}

// מסך שגיאה - חיבור נכשל. נפרד ממצב "משתמש חדש" (ראה InsightsEmptyScreen).
export const InsightsErrorState = ({ onBack, t }: InsightsErrorStateProps) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'var(--app-height, 100dvh)', p: 3, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      <Box sx={{ fontSize: 56, mb: 2, animation: `${float} 2s ease infinite` }}>⚠️</Box>
      <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 1 }}>{t('connectionErrorTitle')}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', mb: 3, maxWidth: 280 }}>
        {t('connectionErrorDesc')}
      </Typography>
      <IconButton onClick={onBack} sx={{ bgcolor: 'primary.main', color: 'white', width: 44, height: 44 }}>
        <ArrowForwardIcon />
      </IconButton>
    </Box>
  );
};
