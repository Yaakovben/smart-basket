import { Paper, Typography, Box } from '@mui/material';
import type { InsightsData } from '../../../../../services/api';

interface PulsePredictionCardProps {
  shoppingFrequency: InsightsData['shoppingFrequency'];
  isDark: boolean;
}

// פורמט תאריך יחסי קצר
const formatRelativeDate = (iso: string | null): string => {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const absDays = Math.round(Math.abs(diff) / 86400000);
  if (absDays === 0) return 'היום';
  if (absDays === 1) return diff > 0 ? 'מחר' : 'אתמול';
  if (diff > 0) return `בעוד ${absDays} ימים`;
  return `לפני ${absDays} ימים`;
};

// כרטיס "קנייה אחרונה" / "הבאה צפויה" - תחזית לפי תדירות הקנייה של המשתמש.
export const PulsePredictionCard = ({ shoppingFrequency, isDark }: PulsePredictionCardProps) => {
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
          קנייה אחרונה: <b>{formatRelativeDate(shoppingFrequency.lastShoppingDate)}</b>
        </Typography>
        {shoppingFrequency.predictedNextDate && (
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0D9488', mt: 0.15 }}>
            הבאה צפויה: {formatRelativeDate(shoppingFrequency.predictedNextDate)}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
