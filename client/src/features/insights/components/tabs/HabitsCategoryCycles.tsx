import { Box, Typography } from '@mui/material';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../../global/constants';
import { SectionCard } from '../insightsShared';

interface HabitsCategoryCyclesProps {
  categoryCycles: InsightsData['categoryCycles'];
  isDark: boolean;
  t: (key: string) => string;
}

// "מחזורי הקנייה שלך" - כל כמה ימים כל קטגוריה נקנית מחדש (מבוסס היסטוריה).
export const HabitsCategoryCycles = ({ categoryCycles, isDark, t }: HabitsCategoryCyclesProps) => {
  if (!categoryCycles || categoryCycles.length < 2) return null;

  const maxCycle = Math.max(...categoryCycles.map(x => x.avgDays), 30);

  return (
    <SectionCard title={t('categoryCyclesTitle')} isDark={isDark}>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.25, lineHeight: 1.5 }}>
        {t('categoryCyclesDesc')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
        {categoryCycles.slice(0, 6).map((c) => {
          const transKey = CATEGORY_TRANSLATION_KEYS[c.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
          const label = transKey ? t(transKey) : c.category;
          const icon = CATEGORY_ICONS[c.category as keyof typeof CATEGORY_ICONS] || '📦';
          const catColor = CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
          // bar width: יחס למחזור הארוך ביותר (עד 30 יום מקסימום ל-scaling)
          const barWidth = Math.min(100, (c.avgDays / maxCycle) * 100);
          return (
            <Box key={c.category} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
              <Box sx={{
                width: 28, height: 28, borderRadius: '8px',
                bgcolor: `${catColor}1a`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, flexShrink: 0,
              }}>
                {icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>{label}</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: catColor, fontVariantNumeric: 'tabular-nums' }}>
                    {t('everyDaysCount').replace('{days}', String(c.avgDays)).replace('{dayWord}', c.avgDays === 1 ? t('dayWordSingle') : t('dayWordPlural'))}
                  </Typography>
                </Box>
                <Box sx={{
                  height: 5, borderRadius: '3px',
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}>
                  <Box sx={{
                    height: '100%', width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${catColor}, ${catColor}aa)`,
                    borderRadius: '3px',
                    transition: 'width 0.6s ease',
                  }} />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
};
