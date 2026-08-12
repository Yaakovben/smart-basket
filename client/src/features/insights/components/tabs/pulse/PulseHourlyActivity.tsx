import { Box, Typography } from '@mui/material';
import { SectionCard, RadialHourClock } from '../../insightsShared';

interface PulseHourlyActivityProps {
  hourlyActivity: number[];
  isDark: boolean;
  t: (key: string) => string;
}

// "פעילות לפי שעות" - שעון רדיאלי 24 שעות + פילוח לבוקר/צהריים/ערב/לילה.
export const PulseHourlyActivity = ({ hourlyActivity, isDark, t }: PulseHourlyActivityProps) => {
  if (!hourlyActivity || !hourlyActivity.some(v => v > 0)) return null;

  const BUCKETS = [
    { label: t('hourlyBucketMorning'), from: 5, to: 11, emoji: '🌅' },
    { label: t('hourlyBucketNoon'), from: 12, to: 16, emoji: '☀️' },
    { label: t('hourlyBucketEvening'), from: 17, to: 22, emoji: '🌆' },
    { label: t('hourlyBucketNight'), from: 23, to: 4, emoji: '🌙' },
  ];

  const maxHour = Math.max(...hourlyActivity, 1);
  const peakHour = hourlyActivity.indexOf(maxHour);
  const bucketTotals = BUCKETS.map(b => {
    let total = 0;
    if (b.from <= b.to) {
      for (let h = b.from; h <= b.to; h++) total += hourlyActivity[h];
    } else {
      for (let h = b.from; h < 24; h++) total += hourlyActivity[h];
      for (let h = 0; h <= b.to; h++) total += hourlyActivity[h];
    }
    return total;
  });
  const peakBucketIdx = bucketTotals.indexOf(Math.max(...bucketTotals));

  return (
    <SectionCard title={t('activityByHourTitle').replace('{peak}', String(peakHour))} isDark={isDark}>
      {/* שעון רדיאלי - 24 קרניים. ויזואליזציה אסטטית במקום grid שטוח. */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <RadialHourClock hourlyActivity={hourlyActivity} isDark={isDark} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.6 }}>
        {BUCKETS.map((b, i) => {
          const isWinner = i === peakBucketIdx && bucketTotals[i] > 0;
          const total = bucketTotals.reduce((a, c) => a + c, 0);
          const pct = total > 0 ? Math.round((bucketTotals[i] / total) * 100) : 0;
          return (
            <Box key={i} sx={{
              textAlign: 'center', py: 0.6, px: 0.5, borderRadius: '8px',
              bgcolor: isWinner
                ? (isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.1)')
                : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)'),
              border: '1px solid',
              borderColor: isWinner ? 'rgba(20,184,166,0.4)' : 'transparent',
            }}>
              <Typography sx={{ fontSize: 13, lineHeight: 1 }}>{b.emoji}</Typography>
              <Typography sx={{
                fontSize: 9.5, fontWeight: 800,
                color: isWinner ? '#14B8A6' : 'text.secondary', mt: 0.3,
              }}>{b.label}</Typography>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: isWinner ? '#14B8A6' : 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                {pct}%
              </Typography>
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
};
