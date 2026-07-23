import { Box, Typography } from '@mui/material';
import type { BranchSourceBreakdown } from '../../priceComparison/services/priceComparison.api';

// צ'יפ קטן להצגת ספירת מקור בפיזור (בראש האדמין) - לא מיוצא, פנימי בלבד
const SourceChip = ({ label, value, color, isDark }: { label: string; value: number; color: string; isDark: boolean }) => (
  <Box sx={{
    display: 'inline-flex', alignItems: 'center', gap: 0.4,
    px: 1, py: 0.4, borderRadius: '999px',
    bgcolor: isDark ? `${color}26` : `${color}14`,
    border: '1px solid', borderColor: `${color}40`,
  }}>
    <Typography sx={{ fontSize: 11, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
  </Box>
);

// ===== פיזור מקורות הסניפים - מידע מפורט לאדמין =====
export const PriceSyncSourceBreakdown = ({ breakdown, isDark }: { breakdown: BranchSourceBreakdown; isDark: boolean }) => (
  <Box sx={{
    display: 'flex', flexWrap: 'wrap', gap: 0.5,
    p: 1, borderRadius: '10px',
    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    border: '1px solid', borderColor: 'divider',
  }}>
    <SourceChip label="פורטל" value={breakdown.portal} color="#10B981" isDark={isDark} />
    <SourceChip label="מקורב" value={breakdown.geocoded} color="#0D9488" isDark={isDark} />
    <SourceChip label="ידני" value={breakdown.manual} color="#7C3AED" isDark={isDark} />
    <SourceChip label="לא מדויק" value={breakdown.unknown} color="#F59E0B" isDark={isDark} />
    {breakdown.noCoords > 0 && (
      <SourceChip label="חסר מיקום" value={breakdown.noCoords} color="#DC2626" isDark={isDark} />
    )}
  </Box>
);
