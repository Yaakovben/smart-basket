import { Box, Typography, Paper } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import StoreIcon from '@mui/icons-material/Store';
import type { PriceChainTotal } from '../types/priceComparison.types';

interface SavingsHeroProps {
  cheapest: PriceChainTotal;
  savings: number;
}

// HERO - פריסה הורייזונטלית קומפקטית: שם הרשת + מחיר בצד אחד, חיסכון בצד השני.
// גובה מקסימלי ~72px במקום ~110px (הקטנה של ~35%).
export const SavingsHero = ({ cheapest, savings }: SavingsHeroProps) => (
  <Paper
    elevation={0}
    sx={{
      mb: 1.25, px: 1.5, py: 1.1,
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #14B8A6 0%, #10B981 50%, #059669 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(16,185,129,0.28)',
    }}
  >
    {/* קישוט רקע */}
    <Box sx={{
      position: 'absolute', top: -28, left: -28,
      width: 90, height: 90, borderRadius: '50%',
      bgcolor: 'rgba(255,255,255,0.07)',
      pointerEvents: 'none',
    }} />

    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {/* צד שמאל: שם הרשת + מחיר */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          <StoreIcon sx={{ fontSize: 13, opacity: 0.85 }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.9, letterSpacing: 0.3 }}>
            הסל הזול ביותר
          </Typography>
        </Box>
        <Typography sx={{
          fontSize: 17, fontWeight: 900, lineHeight: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {cheapest.chainName}
        </Typography>
        <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.2, fontVariantNumeric: 'tabular-nums' }}>
          ₪{cheapest.total.toFixed(0)} · {cheapest.matchedCount} מוצרים
        </Typography>
      </Box>

      {/* מפריד */}
      <Box sx={{ width: 1, height: 44, bgcolor: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />

      {/* צד ימין: חיסכון */}
      {savings > 0 ? (
        <Box sx={{ textAlign: 'center', flexShrink: 0, minWidth: 72 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, mb: 0.2 }}>
            <SavingsIcon sx={{ fontSize: 12, opacity: 0.85 }} />
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.9, letterSpacing: 0.3 }}>
              חיסכון
            </Typography>
          </Box>
          <Typography sx={{
            fontSize: 26, fontWeight: 900, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -0.5,
          }}>
            ₪{savings.toFixed(0)}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', flexShrink: 0, minWidth: 64 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>
            ✓ הזול
          </Typography>
          <Typography sx={{
            fontSize: 22, fontWeight: 900, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ₪{cheapest.total.toFixed(0)}
          </Typography>
        </Box>
      )}
    </Box>
  </Paper>
);
