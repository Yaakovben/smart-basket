import { Box, Typography, Paper } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { PriceChainTotal } from '../types/priceComparison.types';

interface SavingsHeroProps {
  cheapest: PriceChainTotal;
  savings: number;
}

export const SavingsHero = ({ cheapest, savings }: SavingsHeroProps) => (
  <Paper
    elevation={0}
    sx={{
      mb: 1.25, px: 1.75, py: 1,
      borderRadius: '14px',
      background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      color: 'white',
      boxShadow: '0 3px 12px rgba(20,184,166,0.3)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* קישוט רקע */}
    <Box sx={{
      position: 'absolute', top: -20, left: -20,
      width: 80, height: 80, borderRadius: '50%',
      bgcolor: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
    }} />

    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.25 }}>
      {/* צד שמאל: שם + מחיר */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* שורה 1: תווית "הסל הזול" */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
          <StorefrontIcon sx={{ fontSize: 11, opacity: 0.8 }} />
          <Typography sx={{ fontSize: 10, fontWeight: 700, opacity: 0.85, letterSpacing: 0.2 }}>
            הסל הזול ביותר
          </Typography>
        </Box>
        {/* שורה 2: שם הרשת */}
        <Typography sx={{
          fontSize: 15, fontWeight: 900, lineHeight: 1.1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {cheapest.chainName}
        </Typography>
        {/* שורה 3: מחיר + מוצרים */}
        <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.15, fontVariantNumeric: 'tabular-nums' }}>
          ₪{cheapest.total.toFixed(0)} · {cheapest.matchedCount} מוצרים
        </Typography>
      </Box>

      {/* מפריד */}
      {savings > 0 && (
        <Box sx={{ width: 1, height: 40, bgcolor: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
      )}

      {/* צד ימין: חיסכון */}
      {savings > 0 ? (
        <Box sx={{ textAlign: 'center', flexShrink: 0, minWidth: 70 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, mb: 0.15 }}>
            <SavingsIcon sx={{ fontSize: 11, opacity: 0.85 }} />
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.9 }}>
              תחסוך עד
            </Typography>
          </Box>
          <Typography sx={{
            fontSize: 22, fontWeight: 900, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
          }}>
            ₪{savings.toFixed(0)}
          </Typography>
          <Typography sx={{ fontSize: 9, opacity: 0.8, mt: 0.1 }}>
            לעומת היקר ביותר
          </Typography>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', flexShrink: 0, minWidth: 60 }}>
          <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.85, mb: 0.15 }}>
            המחיר הטוב
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            ₪{cheapest.total.toFixed(0)}
          </Typography>
        </Box>
      )}
    </Box>
  </Paper>
);
