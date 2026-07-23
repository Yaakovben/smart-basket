import { Box, Typography } from '@mui/material';
import type { Achievement } from '../../helpers/achievements';
import { fadeIn } from './animations';

// ===== Achievement Badges - שורה של תגי הישגים =====
export const AchievementBadges = ({ items, isDark }: {
  items: Achievement[];
  isDark: boolean;
}) => {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.disabled', letterSpacing: 0.5, mb: 0.85, px: 0.25 }}>
        🏅 ההישגים שלך
      </Typography>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: 0.6,
      }}>
        {items.map((a, i) => (
          <Box key={i} sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.45,
            px: 1, py: 0.5, borderRadius: '999px',
            bgcolor: isDark ? `${a.tone}22` : `${a.tone}14`,
            border: '1.5px solid', borderColor: `${a.tone}55`,
            animation: `${fadeIn} 0.4s ease ${0.05 * i}s both`,
            transition: 'transform 0.15s ease, box-shadow 0.2s ease',
            '&:hover': { boxShadow: `0 3px 10px ${a.tone}40`, transform: 'translateY(-1px)' },
          }}>
            <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{a.emoji}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: a.tone, lineHeight: 1, whiteSpace: 'nowrap' }}>
              {a.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
