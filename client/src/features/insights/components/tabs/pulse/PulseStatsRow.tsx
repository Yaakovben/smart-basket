import { Paper, Typography, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import type { InsightsData } from '../../../../../services/api';
import { useSettings } from '../../../../../global/context/SettingsContext';

interface PulseStatsRowProps {
  streaks: InsightsData['streaks'];
  monthComparison: InsightsData['monthComparison'];
  shoppingFrequency: InsightsData['shoppingFrequency'];
  isDark: boolean;
}

// שורת 3 סטטיסטיקות: סטריק שבועות, צמיחה מול חודש קודם, תדירות קנייה ממוצעת.
export const PulseStatsRow = ({ streaks, monthComparison, shoppingFrequency, isDark }: PulseStatsRowProps) => {
  const { t } = useSettings();
  const hasGrowthBaseline = monthComparison?.hasBaseline ?? false;
  const growth = monthComparison?.productsGrowth ?? 0;
  const growthPositive = hasGrowthBaseline && growth > 0;
  const growthNegative = hasGrowthBaseline && growth < 0;
  const growthColor = !hasGrowthBaseline ? '#94A3B8' : growthPositive ? '#22C55E' : growthNegative ? '#EF4444' : '#94A3B8';
  const GrowthIcon = growthPositive ? TrendingUpIcon : growthNegative ? TrendingDownIcon : TrendingFlatIcon;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
      <Paper elevation={0} sx={{
        p: 1.25, borderRadius: '12px', textAlign: 'center',
        bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)',
        border: '1px solid rgba(20,184,166,0.15)',
      }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#14B8A6', lineHeight: 1 }}>
          🔥{streaks?.currentWeeks || 0}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
          {t('streakLabel').replace('{best}', String(streaks?.longestWeeks || 0))}
        </Typography>
      </Paper>
      <Paper elevation={0} sx={{
        p: 1.25, borderRadius: '12px', textAlign: 'center',
        bgcolor: isDark ? `${growthColor}14` : `${growthColor}0D`,
        border: `1px solid ${growthColor}26`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
          <GrowthIcon sx={{ fontSize: 18, color: growthColor }} />
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: growthColor, lineHeight: 1 }}>
            {!hasGrowthBaseline ? '—' : `${growth > 0 ? '+' : ''}${growth}%`}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
          {hasGrowthBaseline ? t('vsLastMonth') : t('noBaselineMonth')}
        </Typography>
      </Paper>
      <Paper elevation={0} sx={{
        p: 1.25, borderRadius: '12px', textAlign: 'center',
        bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)',
        border: '1px solid rgba(20,184,166,0.15)',
      }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#14B8A6', lineHeight: 1 }}>
          {shoppingFrequency?.avgDaysBetween
            ? (shoppingFrequency.avgDaysBetween === 1 ? t('dayWordSingle') : t('daysBetweenValue').replace('{days}', String(shoppingFrequency.avgDaysBetween)))
            : '—'}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
          {t('avgBetweenPurchases')}
        </Typography>
      </Paper>
    </Box>
  );
};
