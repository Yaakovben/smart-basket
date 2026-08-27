import { memo, useMemo, useCallback } from 'react';
import { Box, Chip } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import type { SavedList } from '../../../../global/types';
import { haptic } from '../../../../global/helpers';

// ===== שורת "רשימות קבועות" =====
// נקודת הכניסה הקלה להזרקת רשימה קבועה שלמה לרשימה הנוכחית בלחיצה אחת.
// כלל הצגה פשוט ועקבי: מוצג צ'יפ לכל רשימה קבועה שיש לה *עדיין מה לתרום*
// (פריט שלא נמצא כרגע ברשימה). ככל שמוסיפים - הצ'יפ נעלם מעצמו. רשימה
// ריקה לגמרי מטופלת ע"י EmptyState (כדי לא להציג כפילות). מי שאין לו
// רשימות קבועות לא רואה כלום. ניהול נעשה מתפריט ה-⋮.

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
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
  height: 32,
  bgcolor: 'rgba(255,255,255,0.16)',
  color: 'white',
  fontWeight: 500,
  fontSize: 13,
  px: 0.25,
  cursor: 'pointer',
  '& .MuiChip-icon': { color: 'rgba(255,255,255,0.75)', ml: '8px', mr: '-2px' },
  '&:hover': { bgcolor: 'rgba(255,255,255,0.26)' },
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

  // מוצג כשיש רשימה קבועה עם מה לתרום. רשימה ריקה -> EmptyState מטפל.
  if (relevant.length === 0 || pendingNames.length === 0) return null;

  return (
    <Box sx={rowSx}>
      {relevant.map(sl => (
        <Chip
          key={sl.id}
          onClick={() => handleApply(sl)}
          sx={chipSx}
          icon={<PlaylistAddRoundedIcon sx={{ fontSize: 16 }} />}
          label={
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 0.25 }}>
              <Box component="span" sx={{ fontSize: 14 }}>{sl.emoji}</Box>
              {sl.name}
            </Box>
          }
        />
      ))}
    </Box>
  );
});

SavedListsBar.displayName = 'SavedListsBar';
