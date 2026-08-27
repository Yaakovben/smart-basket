import { memo, useMemo, useCallback } from 'react';
import { Box, Chip } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import type { SavedList } from '../../../../global/types';
import { haptic } from '../../../../global/helpers';

// ===== שורת "רשימות קבועות" =====
// נקודת הכניסה הקלה להזרקת רשימה קבועה שלמה לרשימה הנוכחית בלחיצה אחת.
// עקרונות עיצוב (בעקבות הכישלון של StaplesBar הישן):
//  1. צ'יפ אחד לכל *רשימה קבועה* (לא לכל מוצר) - בפועל 1-4 צ'יפים.
//  2. לא כפילות של QuickAdd - זו הזרקת אוסף, לא הוספת פריט בודד.
//  3. לא מציק: מוצג רק כשהרשימה כבר התחילה אבל עדיין ב"מצב הקמה"
//     (1..SETUP_MAX-1 פריטים ממתינים) *וגם* יש רשימה קבועה שעוד יש לה
//     מה לתרום. רשימה ריקה לגמרי מטופלת ע"י EmptyState (כדי לא להציג
//     כפילות), ומרגע שהמשתמש התחיל לעבוד ברצינות - הבר נעלם. מי שאין לו
//     רשימות קבועות לא רואה כלום. הזרקה ידנית תמיד זמינה מתפריט ה-⋮.
//  4. משוב הזרקה: הצ'יפ מתרוקן מעצמו - ככל שפריטי החבילה נכנסים לרשימה
//     הוא כבר לא "רלוונטי" ונעלם, ואז טוסט "נוספו X" עם "בטל".

// טווח הפריטים הממתינים שבו הבר מוצג. מתחת ל-1: EmptyState מטפל.
// מ-SETUP_MAX ומעלה: המשתמש כבר "בתוך" הרשימה, לא מקים אותה.
const SETUP_MAX = 5;

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
  height: 30,
  bgcolor: 'rgba(255,255,255,0.18)',
  color: 'white',
  fontWeight: 600,
  fontSize: 12.5,
  cursor: 'pointer',
  '& .MuiChip-icon': { color: 'rgba(255,255,255,0.8)', ml: '7px', mr: '-3px' },
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
  // רשימות קבועות שעוד יש בהן פריט שלא נמצא כרגע ברשימה.
  const relevant = useMemo(() => {
    const present = new Set(pendingNames.map(n => n.trim().toLowerCase()));
    return savedLists.filter(sl => sl.items.some(it => !present.has(it.name.trim().toLowerCase())));
  }, [savedLists, pendingNames]);

  const handleApply = useCallback((sl: SavedList) => {
    haptic('light');
    onApply(sl);
  }, [onApply]);

  // מוצג רק ב-1..SETUP_MAX-1 פריטים ממתינים, וכשיש מה להציע.
  if (relevant.length === 0 || pendingNames.length === 0 || pendingNames.length >= SETUP_MAX) return null;

  return (
    <Box sx={rowSx}>
      {relevant.map(sl => (
        <Chip
          key={sl.id}
          onClick={() => handleApply(sl)}
          size="small"
          sx={chipSx}
          icon={<PlaylistAddRoundedIcon sx={{ fontSize: 15 }} />}
          label={
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box component="span" sx={{ fontSize: 13.5 }}>{sl.emoji}</Box>
              {sl.name}
            </Box>
          }
        />
      ))}
    </Box>
  );
});

SavedListsBar.displayName = 'SavedListsBar';
