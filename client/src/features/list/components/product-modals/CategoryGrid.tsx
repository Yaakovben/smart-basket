import { memo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { ProductCategory } from '../../../../global/types';
import { haptic, CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== גריד קטגוריות - 8 פתוחים בברירת מחדל =====
// 8 הקטגוריות הראשונות מוצגות תמיד (2 שורות), כפתור 'הצג עוד' חושף את
// 6 הנותרות. אם הקטגוריה הנבחרת נמצאת מעבר ל-8 - פותח אוטומטית.
const COLLAPSED_CATS = 8;
const ALL_CATS = Object.entries(CATEGORY_ICONS) as [ProductCategory, string][];

export const CategoryGrid = memo(({ selected, onSelect }: {
  selected: string;
  onSelect: (cat: ProductCategory) => void;
}) => {
  const { t } = useSettings();
  // תמיד סגור בכניסה - 8 הקטגוריות הראשונות בלבד. גם אם הקטגוריה הנבחרת
  // היא 'אחר' (ברירת המחדל, ב-index 13) - הגריד נשאר מצומצם עד שהמשתמש לוחץ.
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ALL_CATS : ALL_CATS.slice(0, COLLAPSED_CATS);
  const hidden = ALL_CATS.length - COLLAPSED_CATS;

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }} role="radiogroup">
        {visible.map(([cat, icon]) => {
          const isSelected = selected === cat;
          return (
            <Box
              key={cat}
              onClick={() => onSelect(cat)}
              role="radio"
              aria-checked={isSelected}
              sx={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 0.5, py: 1.25, px: 0.25,
                borderRadius: '14px', cursor: 'pointer',
                border: '2px solid',
                borderColor: isSelected ? 'primary.main' : 'rgba(20,184,166,0.15)',
                bgcolor: isSelected ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.04)',
                boxShadow: isSelected ? '0 2px 8px rgba(20,184,166,0.2)' : 'none',
                transition: 'all 0.2s',
                '&:active': { transform: 'scale(0.93)' },
              }}
            >
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px',
                bgcolor: isSelected ? 'rgba(20,184,166,0.15)' : 'background.paper',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, transition: 'all 0.2s',
              }}>
                {icon}
              </Box>
              <Typography sx={{
                fontSize: 9.5, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? 'primary.main' : 'text.secondary',
                textAlign: 'center', lineHeight: 1.15,
                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {t(CATEGORY_TRANSLATION_KEYS[cat as ProductCategory])}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {hidden > 0 && (
        <Box
          role="button"
          tabIndex={0}
          onClick={() => { haptic('light'); setShowAll(s => !s); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { haptic('light'); setShowAll(s => !s); } }}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
            mt: 1, py: 0.7,
            borderRadius: '10px',
            bgcolor: 'rgba(20,184,166,0.06)',
            color: 'primary.main',
            fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background-color 0.15s',
            '&:hover': { bgcolor: 'rgba(20,184,166,0.12)' },
          }}
        >
          {showAll ? '▴ הצג פחות' : `▾ הצג עוד (${hidden})`}
        </Box>
      )}
    </>
  );
});
CategoryGrid.displayName = 'CategoryGrid';
