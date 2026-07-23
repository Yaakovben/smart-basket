import { Paper, Typography, Box } from '@mui/material';
import type { InsightsData } from '../../../../../services/api';
import { useSettings } from '../../../../../global/context/SettingsContext';
import { getRelativeTime } from '../../../../../global/helpers/dateFormatting';

interface PulsePredictionCardProps {
  shoppingFrequency: InsightsData['shoppingFrequency'];
  isDark: boolean;
}

// כרטיס "קנייה אחרונה" / "הבאה צפויה" - תחזית לפי תדירות הקנייה של המשתמש.
export const PulsePredictionCard = ({ shoppingFrequency, isDark }: PulsePredictionCardProps) => {
  const { settings } = useSettings();
  if (!shoppingFrequency || !(shoppingFrequency.lastShoppingDate || shoppingFrequency.predictedNextDate)) return null;
  return (
    <Paper elevation={0} sx={{
      p: 1.5, mb: 2, borderRadius: '14px',
      bgcolor: isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)',
      border: '1px solid rgba(20,184,166,0.15)',
      display: 'flex', alignItems: 'center', gap: 1.5,
    }}>
      <Typography sx={{ fontSize: 22 }}>🛒</Typography>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          קנייה אחרונה: <b>{shoppingFrequency.lastShoppingDate ? getRelativeTime(shoppingFrequency.lastShoppingDate, settings.language) : '—'}</b>
        </Typography>
        {shoppingFrequency.predictedNextDate && (
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0D9488', mt: 0.15 }}>
            הבאה צפויה: {getRelativeTime(shoppingFrequency.predictedNextDate, settings.language)}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
