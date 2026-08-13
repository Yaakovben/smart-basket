import { Box, Typography, Paper } from '@mui/material';
import type { PriceChainTotal } from '../types/priceComparison.types';
import { useSettings } from '../../../global/context/SettingsContext';

interface SavingsHeroProps {
  cheapest: PriceChainTotal;
  savings: number;
}

export const SavingsHero = ({ cheapest, savings }: SavingsHeroProps) => {
  const { t } = useSettings();
  return (
  <Paper elevation={0} sx={{
    mb: 1.5,
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 50%, #2DD4BF 100%)',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 8px 24px rgba(13,148,136,0.3), 0 2px 8px rgba(0,0,0,0.08)',
  }}>
    {/* עיגולי רקע */}
    <Box sx={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
    <Box sx={{ position: 'absolute', bottom: -30, left: 10, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.06)', pointerEvents: 'none' }} />

    <Box sx={{ position: 'relative', px: 2, pt: 1.5, pb: 1.5 }}>
      {/* שורה עליונה: תווית */}
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', mb: 0.5, letterSpacing: 0.3 }}>
        {t('savingsHeroLabel')}
      </Typography>

      {/* שם הרשת - הדגשה ראשית */}
      <Typography sx={{
        fontSize: 22, fontWeight: 900, color: 'white',
        lineHeight: 1.1, mb: 1,
        textShadow: '0 1px 4px rgba(0,0,0,0.12)',
      }}>
        {cheapest.chainName}
      </Typography>

      {/* שורה תחתונה: מחיר + חיסכון */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        {/* מחיר הסל */}
        <Box>
          <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', fontWeight: 600, mb: 0.1 }}>
            {t('savingsHeroPriceLabel')}
          </Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'white', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            ₪{cheapest.total.toFixed(0)}
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', mt: 0.1 }}>
            {t('savingsHeroProductsCount').replace('{count}', String(cheapest.matchedCount))}
          </Typography>
        </Box>

        {/* תג חיסכון */}
        {savings > 0 && (
          <Box sx={{
            bgcolor: 'rgba(0,0,0,0.18)',
            backdropFilter: 'blur(8px)',
            borderRadius: '14px',
            px: 1.5, py: 0.75,
            border: '1px solid rgba(255,255,255,0.2)',
            textAlign: 'center',
            flexShrink: 0,
          }}>
            <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.8)', fontWeight: 700, mb: 0.1 }}>
              {t('savingsHeroSaveUpTo')}
            </Typography>
            <Typography sx={{
              fontSize: 24, fontWeight: 900, color: 'white',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              letterSpacing: -0.5,
            }}>
              ₪{savings.toFixed(0)}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  </Paper>
  );
};
