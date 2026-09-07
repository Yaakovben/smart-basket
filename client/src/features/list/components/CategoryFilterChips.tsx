import { memo, type ReactNode } from 'react';
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
  // רכיב קבוע (לא גולל) בקצה השורה - כרגע כפתור "סדר מוצרים", כדי שלא
  // יפתח שורה נפרדת משלו רק בשביל זה (ראו ListComponent).
  trailing?: ReactNode;
}

export const CategoryFilterChips = memo(({
  totalCount,
  activeCategories,
  categoryCounts,
  effectiveCategoryFilter,
  onSelectCategory,
  trailing,
}: CategoryFilterChipsProps) => {
  const { t } = useSettings();

  return (
    // alignItems:'flex-start' (לא center) - הקופסה הפנימית של הצ'יפים
    // כוללת pb:0.5 (מקום לסרגל גלילה) שגבוה מ-32px בפועל; עם center
    // trailing היה מתמרכז בתוך הגובה הזה וזז ~2px למטה מהצ'יפים. עם
    // flex-start שניהם מתחילים באותו y בדיוק - אותו גובה, בלי קפיצה.
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1.5 }}>
      <Box sx={{
        display: 'flex', gap: 0.75, overflowX: 'auto', pb: 0.5, flex: 1, minWidth: 0,
        // ה-bleed חייב להתאים בדיוק לריפוד של אזור התוכן ב-ListComponent
        // (p: { xs: 1.5, sm: 2.5 }) - אחרת הצ'יפים לא נצמדים לקצה בטאבלט.
        // רק בצד ההתחלה (ימין ב-RTL, שם רצועת הצ'יפים נפתחת) - הקצה השני
        // עכשיו יושב לצד trailing, לא נצמד למסך.
        mr: { xs: -1.5, sm: -2.5 }, pr: { xs: 1.5, sm: 2.5 },
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        maskImage: 'linear-gradient(to left, black calc(100% - 12px), transparent)',
        WebkitMaskImage: 'linear-gradient(to left, black calc(100% - 12px), transparent)',
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
      {trailing && <Box sx={{ flexShrink: 0 }}>{trailing}</Box>}
    </Box>
  );
});
CategoryFilterChips.displayName = 'CategoryFilterChips';
