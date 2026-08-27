import { memo, useMemo, useCallback } from 'react';
import { Box, Chip } from '@mui/material';
import type { SavedList } from '../../../../global/types';
import { haptic } from '../../../../global/helpers';

// ===== שורת "רשימות קבועות" =====
// נקודת הכניסה הקלה להזרקת רשימה קבועה שלמה לרשימה הנוכחית בלחיצה אחת.
// עקרונות עיצוב (בעקבות הכישלון של StaplesBar הישן):
//  1. צ'יפ אחד לכל *רשימה קבועה* (לא לכל מוצר) - בפועל 1-4 צ'יפים.
//  2. לא כפילות של QuickAdd - זו הזרקת אוסף, לא הוספת פריט בודד.
//  3. מנהלת את עצמה: מוצגת רק רשימה קבועה שעוד יש לה מה לתרום (יש בה
//     פריט שלא נמצא כרגע ברשימה). ככל שמוסיפים את פריטי החבילה - המונה
//     על הצ'יפ קטן ואז הצ'יפ נעלם. אם אין אף רשימה קבועה רלוונטית -
//     הבר לא מרונדר כלל.
//  4. ניהול (עריכה/מחיקה) נעשה מתפריט ה-⋮ ("רשימות קבועות"), לא מכאן.

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  overflowX: 'auto',
  pb: 0.25,
  mb: { xs: 0.75, sm: 1 },
  '@media (max-width: 360px)': { mb: 0.5 },
  '@media (orientation: landscape) and (max-height: 500px)': { display: 'none' },
  '&::-webkit-scrollbar': { display: 'none' },
  scrollbarWidth: 'none' as const,
};

const chipSx = {
  flexShrink: 0,
  height: 28,
  bgcolor: 'rgba(255,255,255,0.18)',
  color: 'white',
  fontWeight: 600,
  fontSize: 12.5,
  cursor: 'pointer',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
  '&:active': { transform: 'scale(0.96)' },
  transition: 'transform 0.12s ease, background-color 0.15s ease',
};

interface SavedListsBarProps {
  savedLists: SavedList[];
  /** שמות המוצרים שעדיין לא נקנו ברשימה הנוכחית (ממואיזציה ב-ListComponent). */
  pendingNames: string[];
  onApply: (savedList: SavedList) => void;
}

export const SavedListsBar = memo(({ savedLists, pendingNames, onApply }: SavedListsBarProps) => {
  // רק רשימות קבועות שעוד יש בהן פריט שאינו נמצא כרגע ברשימה.
  const relevant = useMemo(() => {
    const present = new Set(pendingNames.map(n => n.trim().toLowerCase()));
    return savedLists
      .map(sl => ({ sl, missing: sl.items.filter(it => !present.has(it.name.trim().toLowerCase())).length }))
      .filter(e => e.missing > 0);
  }, [savedLists, pendingNames]);

  const handleApply = useCallback((sl: SavedList) => {
    haptic('light');
    onApply(sl);
  }, [onApply]);

  if (relevant.length === 0) return null;

  return (
    <Box sx={rowSx}>
      {relevant.map(({ sl, missing }) => (
        <Chip
          key={sl.id}
          onClick={() => handleApply(sl)}
          size="small"
          sx={chipSx}
          label={
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box component="span" sx={{ fontSize: 13.5 }}>{sl.emoji}</Box>
              {sl.name}
              <Box
                component="span"
                sx={{
                  minWidth: 16, px: 0.4, borderRadius: '999px',
                  bgcolor: 'rgba(255,255,255,0.22)', fontSize: 10.5, fontWeight: 700,
                  textAlign: 'center', lineHeight: '16px',
                }}
              >
                {missing}
              </Box>
            </Box>
          }
        />
      ))}
    </Box>
  );
});

SavedListsBar.displayName = 'SavedListsBar';
