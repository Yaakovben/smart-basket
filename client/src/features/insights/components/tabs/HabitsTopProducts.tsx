import { useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../../global/constants';
import { haptic } from '../../../../global/helpers';
import { fadeIn, SectionCard } from '../insightsShared';

interface HabitsTopProductsProps {
  topProducts: InsightsData['topProducts'];
  isDark: boolean;
  t: (key: string) => string;
}

// "המוצרים הנפוצים שלך" - פודיום Top 3 + ראנק 4-8 עם בר התקדמות.
export const HabitsTopProducts = ({ topProducts, isDark, t }: HabitsTopProductsProps) => {
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  if (topProducts.length === 0) return null;

  const topProductsTotalCount = topProducts.reduce((s, p) => s + p.count, 0);
  const maxCount = topProducts[0].count;

  return (
    <SectionCard title="🏆 המוצרים הנפוצים שלך" isDark={isDark}>
      {/* Top 3 - פודיום עם גבהים שונים ואנימציה staggered */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: topProducts.length > 3 ? 1.75 : 0 }}>
        {[1, 0, 2].map(mapIdx => {
          const p = topProducts[mapIdx];
          if (!p) return <Box key={mapIdx} sx={{ flex: 1 }} />;
          const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
          const categoryColor = CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
          const categoryKey = CATEGORY_TRANSLATION_KEYS[p.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
          const categoryLabel = categoryKey ? t(categoryKey) : p.category;
          const medal = ['🥇', '🥈', '🥉'][mapIdx];
          const pct = topProductsTotalCount > 0 ? Math.round((p.count / topProductsTotalCount) * 100) : 0;
          // פודיום: ראשון גבוה יותר
          const elevation = mapIdx === 0 ? 0 : mapIdx === 1 ? 8 : 14;
          const accent = mapIdx === 0 ? '#FBBF24' : mapIdx === 1 ? '#A1A1AA' : '#D97706';
          const isHighlighted = highlightedCategory === p.category;
          return (
            <Box
              key={mapIdx}
              role="button"
              tabIndex={0}
              onClick={() => {
                haptic('light');
                setHighlightedCategory(prev => prev === p.category ? null : p.category);
              }}
              sx={{
                flex: 1, textAlign: 'center', mt: `${elevation}px`,
                p: 1.25, borderRadius: '12px',
                bgcolor: isDark ? `${accent}10` : `${accent}08`,
                border: '1px solid', borderColor: isHighlighted ? categoryColor : `${accent}30`,
                borderBottom: `3px solid ${categoryColor}`,
                cursor: 'pointer',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                boxShadow: isHighlighted ? `0 3px 14px ${categoryColor}55` : 'none',
                animation: `${fadeIn} 0.4s ease ${0.1 + mapIdx * 0.08}s both`,
                transition: 'transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                '&:active': { transform: 'translateY(1px)' },
                '&:focus-visible': { boxShadow: `0 0 0 2px ${categoryColor}` },
              }}
            >
              <Typography sx={{ fontSize: 18, mb: 0.25 }}>{medal}</Typography>
              <Typography sx={{ fontSize: 20, mb: 0.25 }}>{icon}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </Typography>
              {/* תווית קטגוריה */}
              <Typography sx={{
                fontSize: 9, color: categoryColor, fontWeight: 700, mt: 0.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {categoryLabel}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.35, mt: 0.35 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: accent }}>×{p.count}</Typography>
                <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>· {pct}%</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
      {/* ראנק 4-8 */}
      {topProducts.slice(3, 8).map((p, i) => {
        const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
        const pct = topProductsTotalCount > 0 ? Math.round((p.count / topProductsTotalCount) * 100) : 0;
        return (
          <Box key={i} sx={{ mb: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
              <Typography sx={{ fontSize: 11, width: 16, color: 'text.disabled', textAlign: 'center' }}>{i + 4}</Typography>
              <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{pct}%</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#14B8A6', minWidth: 32, textAlign: 'left' }}>×{p.count}</Typography>
            </Box>
            <LinearProgress variant="determinate" value={(p.count / maxCount) * 100}
              sx={{ height: 3, borderRadius: 2, ml: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6', borderRadius: 2 } }} />
          </Box>
        );
      })}
    </SectionCard>
  );
};
