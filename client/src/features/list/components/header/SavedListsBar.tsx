import { memo, useMemo, useCallback, useState } from 'react';
import { Box, Chip, IconButton } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { SavedList } from '../../../../global/types';
import { haptic, safeStorage } from '../../../../global/helpers';

// ===== שורת "רשימות קבועות" =====
// נקודת כניסה מהירה להזרקת רשימה קבועה שלמה לרשימה הנוכחית בלחיצה אחת.
// מוצג צ'יפ לכל רשימה קבועה שיש לה עדיין מה לתרום (פריט שלא נמצא כרגע
// ברשימה) - ככל שמוסיפים, הצ'יפ נעלם מעצמו. רשימה ריקה לגמרי מטופלת ע"י
// EmptyState. המשתמש יכול לסגור את הבר לצמיתות (X) - אז נשארת רק הכניסה
// דרך תפריט ה-⋮ ("רשימות קבועות").

const DISMISS_KEY = 'sb_savedlists_bar_off';

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
  const [dismissed, setDismissed] = useState(() => safeStorage.get(DISMISS_KEY) === 'true');

  // רשימות קבועות שעוד יש בהן פריט שלא נמצא כרגע ברשימה.
  const relevant = useMemo(() => {
    const present = new Set(pendingNames.map(n => n.trim().toLowerCase()));
    return savedLists.filter(sl => sl.items.some(it => !present.has(it.name.trim().toLowerCase())));
  }, [savedLists, pendingNames]);

  const handleApply = useCallback((sl: SavedList) => {
    haptic('light');
    onApply(sl);
  }, [onApply]);

  const handleDismiss = useCallback(() => {
    haptic('light');
    safeStorage.set(DISMISS_KEY, 'true');
    setDismissed(true);
  }, []);

  if (dismissed || relevant.length === 0 || pendingNames.length === 0) return null;

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
      <IconButton
        onClick={handleDismiss}
        aria-label="הסתר"
        sx={{
          flexShrink: 0, width: 26, height: 26,
          color: 'rgba(255,255,255,0.7)',
          bgcolor: 'rgba(255,255,255,0.1)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', color: 'white' },
        }}
      >
        <CloseRoundedIcon sx={{ fontSize: 15 }} />
      </IconButton>
    </Box>
  );
});

SavedListsBar.displayName = 'SavedListsBar';
