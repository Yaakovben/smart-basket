import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== Milestone Progress - הישג הבא בהישג יד =====
// מציג את הbadge הבא שהמשתמש יכול להשיג + progress bar. גורם
// הזדהות והכוונה - "עוד 8 פריטים ל-50!" משכנע יותר מ"קנית 42 פריטים".
type Milestone = { emoji: string; label: string; current: number; target: number; tone: string };

export const MilestoneProgress = ({ stats, streaks, completionRate, isDark }: {
  stats: { totalPurchased: number; totalLists: number };
  streaks: { currentWeeks: number; longestWeeks: number } | undefined;
  completionRate: number;
  isDark: boolean;
}) => {
  // בוחר את ה-milestone הקרוב ביותר שעוד לא הושג
  const all: Milestone[] = [
    { emoji: '✨', label: 'התחלה טובה', current: stats.totalPurchased, target: 10, tone: '#14B8A6' },
    { emoji: '🎯', label: '50 פריטים', current: stats.totalPurchased, target: 50, tone: '#F59E0B' },
    { emoji: '💯', label: '100 פריטים', current: stats.totalPurchased, target: 100, tone: '#F59E0B' },
    { emoji: '🌟', label: '250 פריטים', current: stats.totalPurchased, target: 250, tone: '#F97316' },
    { emoji: '👑', label: '500 פריטים', current: stats.totalPurchased, target: 500, tone: '#DC2626' },
    { emoji: '🔥', label: 'סטריק 4 שבועות', current: streaks?.currentWeeks ?? 0, target: 4, tone: '#EF4444' },
    { emoji: '🔥', label: 'סטריק 8 שבועות', current: streaks?.currentWeeks ?? 0, target: 8, tone: '#EF4444' },
    { emoji: '⚡', label: 'יעיל (75% השלמה)', current: completionRate, target: 75, tone: '#10B981' },
    { emoji: '🏆', label: 'מדייק (90% השלמה)', current: completionRate, target: 90, tone: '#10B981' },
    { emoji: '📚', label: '5 רשימות', current: stats.totalLists, target: 5, tone: '#3B82F6' },
  ];
  const next = all.find(m => m.current < m.target);
  if (!next) return null;
  const pct = Math.min(100, Math.round((next.current / next.target) * 100));
  const remaining = next.target - next.current;

  return (
    <Box sx={{
      mb: 2, p: 1.6, borderRadius: '14px',
      backgroundImage: isDark
        ? `linear-gradient(135deg, ${next.tone}1A, rgba(255,255,255,0.02))`
        : `linear-gradient(135deg, ${next.tone}10, rgba(255,255,255,0.5))`,
      border: '1.5px solid',
      borderColor: isDark ? `${next.tone}40` : `${next.tone}30`,
      boxShadow: isDark
        ? `inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px ${next.tone}1F`
        : `inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px ${next.tone}14`,
      animation: `${fadeIn} 0.45s ease 0.15s both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1 }}>
        <Box sx={{
          width: 42, height: 42, flexShrink: 0,
          borderRadius: '12px',
          backgroundImage: `linear-gradient(135deg, ${next.tone}, ${next.tone}CC)`,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px ${next.tone}50`,
        }}>
          {next.emoji}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.disabled', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            הישג הבא
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            {next.label}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 900, color: next.tone, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {pct}%
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 700, mt: 0.15 }}>
            עוד {remaining}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ height: 7, borderRadius: '4px', bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <Box sx={{
          height: '100%', width: `${pct}%`, borderRadius: '4px',
          backgroundImage: `linear-gradient(90deg, ${next.tone}, ${next.tone}DD)`,
          boxShadow: `0 0 8px ${next.tone}80`,
          transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </Box>
    </Box>
  );
};
