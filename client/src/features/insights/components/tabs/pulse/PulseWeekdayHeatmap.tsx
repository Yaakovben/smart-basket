import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { haptic } from '../../../../../global/helpers';
import { fadeIn, dayLabels, SectionCard } from '../../insightsShared';

interface PulseWeekdayHeatmapProps {
  weekdayActivity: number[];
  isDark: boolean;
  t: (key: string) => string;
}

// "פעילות לפי ימים" - 7 משבצות בעוצמת צבע יחסית, לחיצות לפירוט יום ספציפי.
export const PulseWeekdayHeatmap = ({ weekdayActivity, isDark, t }: PulseWeekdayHeatmapProps) => {
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  if (!weekdayActivity || !weekdayActivity.some(v => v > 0)) return null;

  const maxWeekday = Math.max(...weekdayActivity, 1);
  const bestDayIdx = weekdayActivity.indexOf(maxWeekday);

  return (
    <SectionCard title={t('activityByDayTitle')} isDark={isDark}>
      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'space-between', mb: 1 }}>
        {weekdayActivity.map((count, i) => {
          const intensity = count / maxWeekday;
          const isBest = i === bestDayIdx && count > 0;
          const isSelected = selectedWeekday === i;
          return (
            <Box
              key={i}
              role={count > 0 ? 'button' : undefined}
              tabIndex={count > 0 ? 0 : undefined}
              aria-label={count > 0 ? `${t('weekdayAria').replace('{day}', dayLabels[i]).replace('{count}', String(count))}${isBest ? t('bestDaySuffix') : ''}` : undefined}
              onClick={() => {
                if (count === 0) return;
                haptic('light');
                setSelectedWeekday(prev => prev === i ? null : i);
              }}
              onKeyDown={(e) => {
                if (count === 0) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  haptic('light');
                  setSelectedWeekday(prev => prev === i ? null : i);
                }
              }}
              sx={{
                flex: 1, textAlign: 'center',
                cursor: count > 0 ? 'pointer' : 'default',
                transition: 'transform 0.12s ease',
                '&:focus-visible': { outline: '2px solid #14B8A6', outlineOffset: 2 },
                '&:active': count > 0 ? { transform: 'scale(0.93)' } : {},
              }}
            >
              <Box sx={{
                aspectRatio: '1 / 1', borderRadius: '10px',
                bgcolor: count === 0
                  ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                  : `rgba(20,184,166,${0.18 + intensity * 0.6})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mb: 0.5,
                border: isSelected ? '2px solid #0D9488' : isBest ? '1.5px solid #14B8A6' : '1.5px solid transparent',
                boxShadow: isSelected ? '0 2px 12px rgba(13,148,136,0.45)' : isBest ? '0 2px 10px rgba(20,184,166,0.4)' : 'none',
                transition: 'border 0.2s, box-shadow 0.2s',
              }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: count > 0 ? 'white' : 'text.disabled' }}>
                  {count}
                </Typography>
              </Box>
              <Typography sx={{
                fontSize: 10, fontWeight: 700,
                color: isSelected ? '#0D9488' : isBest ? '#14B8A6' : 'text.secondary',
              }}>
                {dayLabels[i]}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {selectedWeekday !== null && weekdayActivity[selectedWeekday] > 0 && (
        <Box sx={{
          p: 1, borderRadius: '10px', mt: 0.5,
          bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
          animation: `${fadeIn} 0.2s ease both`,
        }}>
          <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
            {(() => {
              const pct = Math.round((weekdayActivity[selectedWeekday] / maxWeekday) * 100);
              const [p1, rest] = t('weekdaySelectedDetail').split('{day}');
              const [p2, rest2] = rest.split('{count}');
              const [p3, p4] = rest2.split('{pct}');
              return <>{p1}<b>{dayLabels[selectedWeekday]}</b>{p2}<b>{weekdayActivity[selectedWeekday]}</b>{p3}{pct}{p4}</>;
            })()}
          </Typography>
        </Box>
      )}
    </SectionCard>
  );
};
