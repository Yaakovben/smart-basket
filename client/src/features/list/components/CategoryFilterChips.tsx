import { memo } from 'react';
import { Box, Chip } from '@mui/material';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';
import { useSettings } from '../../../global/context/SettingsContext';

// ===== שורת צ'יפים לסינון מוצרים לפי קטגוריה =====
interface CategoryFilterChipsProps {
  totalCount: number;
  activeCategories: string[];
  categoryCounts: Map<string, number>;
  effectiveCategoryFilter: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const CategoryFilterChips = memo(({
  totalCount,
  activeCategories,
  categoryCounts,
  effectiveCategoryFilter,
  onSelectCategory,
}: CategoryFilterChipsProps) => {
  const { t } = useSettings();

  return (
    <Box sx={{
      display: 'flex', gap: 0.75, mb: 1.5, overflowX: 'auto', pb: 0.5,
      mx: -1.5, px: 1.5,
      '&::-webkit-scrollbar': { display: 'none' },
      maskImage: 'linear-gradient(to left, transparent, black 12px, black calc(100% - 12px), transparent)',
      WebkitMaskImage: 'linear-gradient(to left, transparent, black 12px, black calc(100% - 12px), transparent)',
    }}>
      <Chip
        label={`${t('all')} (${totalCount})`}
        size="small"
        onClick={() => onSelectCategory(null)}
        sx={{
          fontSize: 12, fontWeight: 600, flexShrink: 0, height: 32,
          bgcolor: 'action.hover',
          color: 'text.primary',
          border: '1.5px solid',
          borderColor: !effectiveCategoryFilter ? 'primary.main' : 'transparent',
          boxShadow: !effectiveCategoryFilter ? '0 2px 10px rgba(20,184,166,0.35)' : 'none',
          transition: 'box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.1s',
          '&:active': { opacity: 0.75 },
          '&:hover': { bgcolor: 'action.hover' },
        }}
      />
      {activeCategories.map(cat => {
        const count = categoryCounts.get(cat) || 0;
        const icon = CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || '📦';
        const key = CATEGORY_TRANSLATION_KEYS[cat as keyof typeof CATEGORY_TRANSLATION_KEYS];
        const color = CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#6B7280';
        const isActive = effectiveCategoryFilter === cat;
        return (
          <Chip
            key={cat}
            label={`${icon} ${key ? t(key) : cat} (${count})`}
            size="small"
            onClick={() => onSelectCategory(isActive ? null : cat)}
            sx={{
              fontSize: 12, fontWeight: 600, flexShrink: 0, height: 32,
              bgcolor: 'action.hover',
              color: 'text.primary',
              border: '1.5px solid',
              borderColor: isActive ? color : 'transparent',
              boxShadow: isActive ? `0 2px 10px ${color}66` : 'none',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.1s',
              '&:active': { opacity: 0.75 },
              '&:hover': { bgcolor: 'action.hover' },
            }}
          />
        );
      })}
    </Box>
  );
});
CategoryFilterChips.displayName = 'CategoryFilterChips';
