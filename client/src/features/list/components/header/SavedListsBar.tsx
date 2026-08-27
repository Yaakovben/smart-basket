import { memo, useMemo, useState, useCallback } from 'react';
import { Box, Chip } from '@mui/material';
import PlaylistAddCheckRoundedIcon from '@mui/icons-material/PlaylistAddCheckRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import type { Product, SavedList } from '../../../../global/types';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== שורת "רשימות קבועות" =====
// נקודת הכניסה היחידה והקלה להזרקת רשימה קבועה שלמה לתוך הרשימה הנוכחית.
// עקרונות עיצוב (בעקבות הכישלון של StaplesBar הישן):
//  1. צ'יפ אחד לכל *רשימה קבועה* (לא לכל מוצר) - בפועל 1-4 צ'יפים, לא תריסר.
//  2. לא כפילות של QuickAdd - זו הזרקת אוסף, לא הוספת פריט בודד.
//  3. מתקפלת מעצמה: כשהרשימה כבר מבוססת (>= COLLAPSE_AT פריטים ממתינים)
//     הבר מצטמצם לקישור זעיר בשורה אחת, כי "התחלה מרשימה קבועה" רלוונטית
//     בעיקר ברשימה ריקה/קצרה. לחיצה פותחת אותו שוב.
//  4. אם למשתמש אין רשימות קבועות בכלל - הבר לא מרונדר כלל (גילוי הפיצ'ר
//     דרך תפריט ה-⋮ "שמור כרשימה קבועה").

const COLLAPSE_AT = 6;

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  overflowX: 'auto',
  pb: 0.25,
  '&::-webkit-scrollbar': { display: 'none' },
  scrollbarWidth: 'none' as const,
};

const filledChipSx = {
  flexShrink: 0,
  bgcolor: 'rgba(255,255,255,0.18)',
  color: 'white',
  fontWeight: 600,
  fontSize: 12.5,
  cursor: 'pointer',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
  '&:active': { transform: 'scale(0.96)' },
  transition: 'transform 0.12s ease, background-color 0.15s ease',
};

const ghostChipSx = {
  flexShrink: 0,
  bgcolor: 'transparent',
  border: '1px dashed rgba(255,255,255,0.5)',
  color: 'rgba(255,255,255,0.9)',
  fontWeight: 600,
  fontSize: 12.5,
  '& .MuiChip-icon': { color: 'rgba(255,255,255,0.85)' },
};

interface SavedListsBarProps {
  savedLists: SavedList[];
  pendingProducts: Product[];
  onApply: (savedList: SavedList) => void;
  onManage: () => void;
}

export const SavedListsBar = memo(({ savedLists, pendingProducts, onApply, onManage }: SavedListsBarProps) => {
  const { t } = useSettings();
  const [expanded, setExpanded] = useState(false);

  // כמה פריטים מכל רשימה קבועה עדיין חסרים ברשימה הנוכחית - כדי להסתיר
  // צ'יפ של רשימה שכל פריטיה כבר נמצאים (אין מה להוסיף).
  const enriched = useMemo(() => {
    const present = new Set(pendingProducts.map(p => p.name.trim().toLowerCase()));
    return savedLists
      .map(sl => ({
        savedList: sl,
        missing: sl.items.filter(it => !present.has(it.name.trim().toLowerCase())).length,
      }))
      .filter(e => e.missing > 0);
  }, [savedLists, pendingProducts]);

  const handleApply = useCallback((sl: SavedList) => {
    haptic('light');
    onApply(sl);
  }, [onApply]);

  if (enriched.length === 0) return null;

  const collapsed = pendingProducts.length >= COLLAPSE_AT && !expanded;

  if (collapsed) {
    return (
      <Box sx={{ display: 'flex' }}>
        <Box
          onClick={() => setExpanded(true)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            cursor: 'pointer', py: 0.25,
            color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600,
            '&:active': { opacity: 0.7 },
          }}
        >
          <PlaylistAddCheckRoundedIcon sx={{ fontSize: 15 }} />
          {t('savedLists')}
          <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={rowSx}>
      {enriched.map(({ savedList, missing }) => (
        <Chip
          key={savedList.id}
          onClick={() => handleApply(savedList)}
          size="small"
          sx={filledChipSx}
          label={
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box component="span" sx={{ fontSize: 13 }}>{savedList.emoji}</Box>
              {savedList.name}
              <Box component="span" sx={{ opacity: 0.65, fontWeight: 700, ml: 0.25 }}>{missing}</Box>
            </Box>
          }
        />
      ))}
      <Chip
        icon={<TuneRoundedIcon sx={{ fontSize: 14 }} />}
        label={t('manageSavedLists')}
        onClick={() => { haptic('light'); onManage(); }}
        size="small"
        sx={ghostChipSx}
      />
    </Box>
  );
});

SavedListsBar.displayName = 'SavedListsBar';
