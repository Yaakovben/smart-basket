import { Box, Typography } from '@mui/material';
import { fadeIn } from './animations';

// ===== MonthVsMonth - השוואה ויזואלית של החודש הזה לקודם =====
// משתמש ב-monthComparison שכבר מחושב בשרת. מציג שני בארים אופקיים
// יחסיים זה לזה. הכי חזק ויזואלית כשיש שיפור משמעותי.
export const MonthVsMonthStrip = ({ thisMonth, lastMonth, hasBaseline, isDark }: {
  thisMonth: number; lastMonth: number; hasBaseline: boolean; isDark: boolean;
}) => {
  if (!hasBaseline) return null;
  const max = Math.max(thisMonth, lastMonth, 1);
  const thisPct = (thisMonth / max) * 100;
  const lastPct = (lastMonth / max) * 100;
  const isUp = thisMonth > lastMonth;
  const isFlat = thisMonth === lastMonth;
  const delta = thisMonth - lastMonth;
  const deltaPct = lastMonth > 0 ? Math.round((delta / lastMonth) * 100) : 0;

  return (
    <Box sx={{
      mb: 2, p: 1.75, borderRadius: '16px',
      backgroundImage: isDark
        ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(20,184,166,0.06))'
        : 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(20,184,166,0.04))',
      border: '1px solid',
      borderColor: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.18)',
      boxShadow: isDark
        ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
        : 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(99,102,241,0.08)',
      animation: `${fadeIn} 0.4s ease 0.1s both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: isDark ? '#A5B4FC' : '#4338CA', letterSpacing: 0.4 }}>
          📊 חודש מול חודש
        </Typography>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.3,
          px: 0.7, py: 0.2, borderRadius: '999px',
          bgcolor: isFlat ? 'rgba(148,163,184,0.18)' : isUp ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
          border: '1px solid',
          borderColor: isFlat ? 'rgba(148,163,184,0.4)' : isUp ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
        }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: isFlat ? '#64748B' : isUp ? '#10B981' : '#EF4444', lineHeight: 1 }}>
            {isFlat ? '═' : isUp ? '▲' : '▼'} {isFlat ? '0%' : `${isUp ? '+' : ''}${deltaPct}%`}
          </Typography>
        </Box>
      </Box>
      {/* This month */}
      <Box sx={{ mb: 0.85 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.primary' }}>החודש</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 900, color: '#6366F1', fontVariantNumeric: 'tabular-nums' }}>
            {thisMonth} פריטים
          </Typography>
        </Box>
        <Box sx={{ height: 8, borderRadius: '4px', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <Box sx={{
            height: '100%', width: `${thisPct}%`, borderRadius: '4px',
            backgroundImage: 'linear-gradient(90deg, #6366F1, #4F46E5)',
            boxShadow: '0 0 6px rgba(99,102,241,0.5)',
            transition: 'width 0.8s ease',
          }} />
        </Box>
      </Box>
      {/* Last month */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.35 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary' }}>חודש שעבר</Typography>
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {lastMonth} פריטים
          </Typography>
        </Box>
        <Box sx={{ height: 6, borderRadius: '3px', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <Box sx={{
            height: '100%', width: `${lastPct}%`, borderRadius: '3px',
            bgcolor: isDark ? 'rgba(165,180,252,0.5)' : 'rgba(99,102,241,0.4)',
            transition: 'width 0.8s ease',
          }} />
        </Box>
      </Box>
    </Box>
  );
};
