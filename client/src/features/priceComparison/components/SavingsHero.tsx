import { Box, Typography, Paper } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import type { PriceChainTotal } from '../types/priceComparison.types';

interface SavingsHeroProps {
  cheapest: PriceChainTotal;
  savings: number;
}

export const SavingsHero = ({ cheapest, savings }: SavingsHeroProps) => (
  <Paper elevation={0} sx={{
    mb: 1.5,
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 60%, #0F766E 100%)',
    color: 'white',
    boxShadow: '0 6px 20px rgba(20,184,166,0.35)',
    overflow: 'hidden',
    position: 'relative',
  }}>
    {/* עיגולי רקע דקורטיביים */}
    <Box sx={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
    <Box sx={{ position: 'absolute', bottom: -20, left: -10, width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

    <Box sx={{ position: 'relative', p: 1.75 }}>
      {savings > 0 ? (
        /* יש חיסכון - הדגש את הסכום */
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* שמאל: סכום החיסכון */}
          <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8, letterSpacing: 0.5, textTransform: 'uppercase', mb: 0.1 }}>
              תחסוך עד
            </Typography>
            <Typography sx={{
              fontSize: 36, fontWeight: 900, lineHeight: 0.95,
              fontVariantNumeric: 'tabular-nums', letterSpacing: -1,
              textShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              ₪{savings.toFixed(0)}
            </Typography>
          </Box>

          {/* מפריד */}
          <Box sx={{ width: 1, alignSelf: 'stretch', bgcolor: 'rgba(255,255,255,0.22)' }} />

          {/* ימין: שם הרשת + פרטים */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
              <SavingsIcon sx={{ fontSize: 13, opacity: 0.8 }} />
              <Typography sx={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>
                אם תקנה ב
              </Typography>
            </Box>
            <Typography sx={{
              fontSize: 17, fontWeight: 900, lineHeight: 1.1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {cheapest.chainName}
            </Typography>
            <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.3, fontVariantNumeric: 'tabular-nums' }}>
              סה״כ ₪{cheapest.total.toFixed(0)} · {cheapest.matchedCount} מוצרים
            </Typography>
          </Box>
        </Box>
      ) : (
        /* אין חיסכון - הצג את הסל הזול */
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, opacity: 0.8, mb: 0.2 }}>
              🛒 הסל הזול ביותר
            </Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cheapest.chainName}
            </Typography>
            <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.2 }}>
              {cheapest.matchedCount} מוצרים
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 28, fontWeight: 900, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            ₪{cheapest.total.toFixed(0)}
          </Typography>
        </Box>
      )}
    </Box>
  </Paper>
);
