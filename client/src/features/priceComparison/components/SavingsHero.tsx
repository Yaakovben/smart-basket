import { Box, Typography, Paper } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import StoreIcon from '@mui/icons-material/Store';
import type { PriceChainTotal } from '../types/priceComparison.types';

interface SavingsHeroProps {
  cheapest: PriceChainTotal;
  savings: number;
}

// HERO - שורה אחת קומפקטית: אייקון + שם רשת + מחיר + חיסכון. גובה ~56px.
export const SavingsHero = ({ cheapest, savings }: SavingsHeroProps) => (
  <Paper
    elevation={0}
    sx={{
      mb: 1.25, px: 1.5, py: 0.75,
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      color: 'white',
      boxShadow: '0 2px 10px rgba(20,184,166,0.28)',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* אייקון חנות */}
      <StoreIcon sx={{ fontSize: 16, opacity: 0.85, flexShrink: 0 }} />

      {/* תווית + שם הרשת */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, opacity: 0.8, flexShrink: 0 }}>
          הסל הזול:
        </Typography>
        <Typography sx={{
          fontSize: 14, fontWeight: 800, lineHeight: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {cheapest.chainName}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.9, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          ₪{cheapest.total.toFixed(0)}
        </Typography>
      </Box>

      {/* מפריד */}
      {savings > 0 && (
        <Box sx={{ width: 1, height: 28, bgcolor: 'rgba(255,255,255,0.25)', flexShrink: 0, mx: 0.25 }} />
      )}

      {/* חיסכון */}
      {savings > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, flexShrink: 0 }}>
          <SavingsIcon sx={{ fontSize: 14, opacity: 0.85 }} />
          <Typography sx={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>
            חיסכון
          </Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.3 }}>
            ₪{savings.toFixed(0)}
          </Typography>
        </Box>
      )}
    </Box>
  </Paper>
);
