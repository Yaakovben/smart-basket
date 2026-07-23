import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// תווית קטנה שמופיעה ליד הציון בדופק: "+5 השבוע" או "-2" (ראה useScoreDelta).
export const ScoreTrendBadge = ({ delta }: { delta: number | null }) => {
  if (delta === null || delta === 0) return null;
  const positive = delta > 0;
  const color = positive ? '#10B981' : '#EF4444';
  const arrow = positive ? '▲' : '▼';
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.25,
      px: 0.7, py: 0.25, borderRadius: '999px',
      bgcolor: `${color}1A`,
      border: `1.5px solid ${color}40`,
      animation: `${fadeIn} 0.4s ease 0.5s both`,
    }}>
      <Typography sx={{ fontSize: 8.5, color, fontWeight: 800, lineHeight: 1 }}>{arrow}</Typography>
      <Typography sx={{ fontSize: 10, color, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {positive ? '+' : ''}{delta}
      </Typography>
    </Box>
  );
};
