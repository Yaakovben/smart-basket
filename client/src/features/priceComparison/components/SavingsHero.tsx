import { Box, Typography, Paper } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import type { PriceChainTotal } from '../types/priceComparison.types';

interface SavingsHeroProps {
  cheapest: PriceChainTotal;
  savings: number;
}

// HERO - חיסכון מובלט אבל לא צועק. הוקטן מ-56px ל-38px לאחר משוב.
export const SavingsHero = ({ cheapest, savings }: SavingsHeroProps) => (
  <Paper
    elevation={0}
    sx={{
      mb: 1.5, p: 1.75,
      borderRadius: '18px',
      background: 'linear-gradient(135deg, #14B8A6 0%, #10B981 50%, #059669 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 6px 20px rgba(16,185,129,0.32)',
    }}
  >
    {/* קישוט רקע - עיגול דהוי */}
    <Box sx={{
      position: 'absolute', top: -36, left: -36,
      width: 130, height: 130, borderRadius: '50%',
      bgcolor: 'rgba(255,255,255,0.08)',
      pointerEvents: 'none',
    }} />

    <Box sx={{ position: 'relative' }}>
      {savings > 0 ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
            <SavingsIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, opacity: 0.95 }}>
              תחסוך עד
            </Typography>
          </Box>
          <Typography sx={{
            fontSize: 38, fontWeight: 800, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -0.8,
            textShadow: '0 1px 6px rgba(0,0,0,0.15)',
          }}>
            ₪{savings.toFixed(0)}
          </Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, opacity: 0.95, mt: 0.6 }}>
            אם תקנה ב-<Typography component="span" sx={{ fontWeight: 800 }}>{cheapest.chainName}</Typography>
          </Typography>
          <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.2 }}>
            סה"כ הסל ₪{cheapest.total.toFixed(0)} · {cheapest.matchedCount} מוצרים
          </Typography>
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.4 }}>
            <SavingsIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, opacity: 0.95 }}>
              הסל הזול
            </Typography>
          </Box>
          <Typography sx={{
            fontSize: 28, fontWeight: 800, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {cheapest.chainName}
          </Typography>
          <Typography sx={{ fontSize: 19, fontWeight: 800, mt: 0.4, fontVariantNumeric: 'tabular-nums' }}>
            ₪{cheapest.total.toFixed(0)}
          </Typography>
        </>
      )}
    </Box>
  </Paper>
);
