import { Box, Typography } from '@mui/material';
import type { InsightsData } from '../../../../../services/api';
import { fadeIn } from '../../insightsShared';

interface PulseMomentumCardProps {
  weeklyTrends: InsightsData['weeklyTrends'];
  t: (key: string) => string;
}

// כרטיס "מומנטום שבועי" - השוואת הפריטים שנקנו השבוע מול השבוע הקודם.
export const PulseMomentumCard = ({ weeklyTrends, t }: PulseMomentumCardProps) => {
  const wt = weeklyTrends || [];
  const lastWeek = wt[wt.length - 1];
  const prevWeek = wt[wt.length - 2];
  const hasMomentumData = lastWeek && prevWeek;
  if (!hasMomentumData || !(lastWeek.purchased > 0 || prevWeek.purchased > 0)) return null;

  const purchasedDelta = lastWeek.purchased - prevWeek.purchased;
  const momentumPct = prevWeek.purchased > 0 ? Math.round((purchasedDelta / prevWeek.purchased) * 100) : null;
  const momentumUp = purchasedDelta > 0;
  const momentumDown = purchasedDelta < 0;

  return (
    <Box sx={{
      mb: 1.75, p: 1.5, borderRadius: '14px',
      background: momentumUp
        ? 'linear-gradient(135deg, #10B981, #059669)'
        : momentumDown
        ? 'linear-gradient(135deg, #6366F1, #4F46E5)'
        : 'linear-gradient(135deg, #14B8A6, #0D9488)',
      color: 'white',
      display: 'flex', alignItems: 'center', gap: 1.25,
      boxShadow: `0 4px 14px ${momentumUp ? 'rgba(16,185,129,0.32)' : 'rgba(79,70,229,0.3)'}`,
      animation: `${fadeIn} 0.45s ease 0.1s both`,
    }}>
      <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
        {momentumUp ? '📈' : momentumDown ? '📉' : '⚖️'}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.4 }}>
          {t('weeklyMomentumLabel')}
        </Typography>
        <Typography sx={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1, mt: 0.15, fontVariantNumeric: 'tabular-nums' }}>
          {t('itemsCountLabel').replace('{count}', String(lastWeek.purchased))}{' '}
          {momentumPct !== null && (
            <Typography component="span" sx={{ fontSize: 13, fontWeight: 800, opacity: 0.95 }}>
              ({momentumUp ? '+' : ''}{momentumPct}%)
            </Typography>
          )}
        </Typography>
        <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.15 }}>
          {momentumUp
            ? t('upFromLastWeek').replace('{count}', String(purchasedDelta))
            : momentumDown
            ? t('downFromLastWeek').replace('{count}', String(Math.abs(purchasedDelta)))
            : t('stableFromLastWeek')}
        </Typography>
      </Box>
    </Box>
  );
};
