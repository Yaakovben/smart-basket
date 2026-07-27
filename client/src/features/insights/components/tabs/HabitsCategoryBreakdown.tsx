import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../../global/constants';
import { haptic } from '../../../../global/helpers';
import { SectionCard, CategoryDonut } from '../insightsShared';

interface HabitsCategoryBreakdownProps {
  categoryBreakdown: InsightsData['categoryBreakdown'];
  isDark: boolean;
  t: (key: string) => string;
}

// "פילוח קטגוריות" - דונאט אנימטיבי + רשימה לחיצה עם bar מחולק אופקי.
export const HabitsCategoryBreakdown = ({ categoryBreakdown, isDark, t }: HabitsCategoryBreakdownProps) => {
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  if (categoryBreakdown.length === 0) return null;

  const donutItems = categoryBreakdown.slice(0, 6).map(c => {
    const key = CATEGORY_TRANSLATION_KEYS[c.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
    return {
      category: c.category,
      count: c.count,
      percentage: c.percentage,
      color: CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS] || '#6B7280',
      icon: CATEGORY_ICONS[c.category as keyof typeof CATEGORY_ICONS] || '📦',
      label: key ? t(key) : c.category,
    };
  });

  return (
    <SectionCard title="📊 פילוח קטגוריות" isDark={isDark}>
      {/* דונאט עם תווית מרכזית מתחלפת + legend מינימליסטי */}
      {donutItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <CategoryDonut
            items={donutItems}
            isDark={isDark}
            selected={highlightedCategory}
            onSelect={(cat) => setHighlightedCategory(prev => prev === cat ? null : cat)}
          />
        </Box>
      )}
      {/* בר מחולק אופקי - השוואה מהירה של כל הקטגוריות בבת אחת */}
      <Box sx={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
        {categoryBreakdown.map(cat => {
          const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
          return <Box key={cat.category} sx={{ width: `${cat.percentage}%`, bgcolor: color, transition: 'width 0.8s ease' }} />;
        })}
      </Box>
      {/* רשימה קומפקטית - לחיצה על שורה מדגישה */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
        {categoryBreakdown.slice(0, 8).map(cat => {
          const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
          const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
          const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
          const isActive = highlightedCategory === cat.category;
          return (
            <Box
              key={cat.category}
              onClick={() => {
                haptic('light');
                setHighlightedCategory(prev => prev === cat.category ? null : cat.category);
              }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 0.75, py: 0.55, borderRadius: '8px',
                cursor: 'pointer',
                bgcolor: isActive ? `${color}14` : 'transparent',
                border: '1px solid',
                borderColor: isActive ? `${color}40` : 'transparent',
                transition: 'background 0.2s, border-color 0.2s',
                '&:active': { opacity: 0.8 },
              }}
            >
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13 }}>{icon}</Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: isActive ? 800 : 600, flex: 1 }}>
                {key ? t(key) : cat.category}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{cat.count}</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color, minWidth: 36, textAlign: 'left' }}>{cat.percentage}%</Typography>
            </Box>
          );
        })}
      </Box>
    </SectionCard>
  );
};
