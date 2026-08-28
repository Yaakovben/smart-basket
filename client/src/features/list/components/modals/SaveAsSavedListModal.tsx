import { useState, useCallback } from 'react';
import { Box, Typography, Button, Chip, CircularProgress, Collapse, TextField, InputAdornment } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import type { Product, SavedList } from '../../../../global/types';
import { Modal, ClearableTextField } from '../../../../global/components';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { SAVED_LIST_EMOJIS, MAX_SAVED_LIST_ITEMS, newSavedListId, nameToSavedItem, productsToSavedItems } from '../../helpers/savedList-helpers';

// ===== מודל "שמור כרשימה קבועה" =====
// מקפיא את המוצרים הנוכחיים של הרשימה כרשימה קבועה בעלת שם ואמוג׳י.
// נפתח מתפריט ה-⋮ של הרשימה (כשיש מוצרים). מינימום טקסט - כותרת, שורת
// אמוג׳י+שם, תצוגה מקדימה של הפריטים, כפתור שמירה.
interface SaveAsSavedListModalProps {
  products: Product[];
  onSave: (savedList: SavedList) => Promise<void>;
  onClose: () => void;
}

export const SaveAsSavedListModal = ({ products, onSave, onClose }: SaveAsSavedListModalProps) => {
  const { t } = useSettings();
  // ריק בכוונה - השם לא נגזר משם הרשימה הנוכחית, המשתמש חייב לבחור בעצמו.
  // ה-placeholder (savedListNameExample) הוא הדגמה, לא ברירת מחדל אמיתית.
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(SAVED_LIST_EMOJIS[0]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // אפשר להסיר *וגם להוסיף* פריטים לפני השמירה (init פעם אחת מהמוצרים הנוכחיים).
  const [items, setItems] = useState(() => productsToSavedItems(products));
  const [newItemText, setNewItemText] = useState('');
  const removeItem = (n: string) => { haptic('light'); setItems(prev => prev.filter(it => it.name !== n)); };
  const addItem = () => {
    const item = nameToSavedItem(newItemText);
    if (!item) return;
    setNewItemText('');
    setItems(prev => {
      if (prev.length >= MAX_SAVED_LIST_ITEMS) return prev;
      if (prev.some(it => it.name.trim().toLowerCase() === item.name.toLowerCase())) return prev;
      return [...prev, item];
    });
  };
  const canSave = name.trim().length >= 2 && items.length > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (name.trim().length < 2 || items.length === 0 || saving) return;
    haptic('light');
    setSaving(true);
    try {
      await onSave({ id: newSavedListId(), emoji, name: name.trim(), items });
      onClose();
    } finally {
      setSaving(false);
    }
  }, [name, emoji, items, saving, onSave, onClose]);

  return (
    <Modal title={t('saveAsSavedListTitle')} onClose={() => !saving && onClose()}>
      {/* הסבר קצר */}
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.55, mb: 2 }}>
        {t('saveAsSavedListHint')}
      </Typography>

      {/* אמוג׳י (כפתור שפותח בורר) + שם, בשורה אחת - אותו גובה */}
      <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1.25, mb: emojiOpen ? 1.5 : 2.5 }}>
        <Box
          onClick={() => { haptic('light'); setEmojiOpen(o => !o); }}
          aria-label={t('chooseIcon')}
          sx={{
            width: 44, minHeight: 44, flexShrink: 0, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, cursor: 'pointer',
            bgcolor: emojiOpen ? 'rgba(20,184,166,0.1)' : 'action.hover',
            border: '1px solid', borderColor: emojiOpen ? 'primary.main' : 'divider',
            '&:active': { transform: 'scale(0.94)' }, transition: 'all 0.12s',
          }}
        >
          {emoji}
        </Box>
        <ClearableTextField
          autoFocus
          fullWidth
          placeholder={t('savedListNameExample')}
          value={name}
          onChange={e => setName(e.target.value.slice(0, 40))}
          onClear={() => setName('')}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': { height: 44, borderRadius: '12px' },
            '& .MuiOutlinedInput-input': { py: 0, fontSize: 15 },
          }}
        />
      </Box>

      <Collapse in={emojiOpen} unmountOnExit>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
          {SAVED_LIST_EMOJIS.map(e => (
            <Box
              key={e}
              onClick={() => { haptic('light'); setEmoji(e); setEmojiOpen(false); }}
              sx={{
                width: 38, height: 38, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, cursor: 'pointer',
                bgcolor: emoji === e ? 'rgba(20,184,166,0.12)' : 'action.hover',
                border: '1px solid', borderColor: emoji === e ? 'primary.main' : 'transparent',
                '&:active': { transform: 'scale(0.9)' }, transition: 'all 0.12s',
              }}
            >
              {e}
            </Box>
          ))}
        </Box>
      </Collapse>

      {/* תצוגה מקדימה: הצ'יפים שיישמרו, עם מונה. אפשר להסיר ולהוסיף. */}
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mb: 1.25,
        maxHeight: 152, overflowY: 'auto', overscrollBehavior: 'contain',
        p: 1.25, borderRadius: '12px', border: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{
          flexShrink: 0, minWidth: 24, height: 22, px: 0.75,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '999px', bgcolor: 'rgba(20,184,166,0.14)', color: 'primary.main',
          fontSize: 12, fontWeight: 700,
        }}>
          {items.length}
        </Box>
        {items.map(it => (
          <Chip
            key={it.name}
            label={it.name}
            onDelete={() => removeItem(it.name)}
            sx={{
              fontSize: 13, height: 31, bgcolor: 'action.hover', pr: '2px',
              '& .MuiChip-label': { pr: 0.5 },
              '& .MuiChip-deleteIcon': {
                color: 'rgba(239,68,68,0.7)', fontSize: 15, m: 0, mr: '4px',
                borderRadius: '50%', bgcolor: 'rgba(239,68,68,0.1)', transition: 'all 0.12s',
                '&:hover': { color: 'white', bgcolor: 'error.main' },
              },
            }}
          />
        ))}
      </Box>

      {/* הוספת פריט שלא ברשימה הנוכחית - בסגנון "הוספה מהירה" */}
      <TextField
        fullWidth
        value={newItemText}
        onChange={e => setNewItemText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
        placeholder={t('savedListAddItemPlaceholder')}
        size="small"
        inputProps={{ autoCapitalize: 'sentences', autoCorrect: 'off', spellCheck: false }}
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper', borderRadius: '12px', height: 48, pr: '5px',
            boxShadow: '0 1px 5px rgba(0,0,0,0.07)',
            '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(20,184,166,0.18)' },
          },
          '& .MuiOutlinedInput-input': { fontSize: 15, py: 0 },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={{ mr: 1.25 }}><Box sx={{ fontSize: 17 }}>🛒</Box></InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end" sx={{ ml: 0.75 }}>
              {/* עם טקסט, לא רק אייקון - "פלוס" בלי הסבר לצד כפתור "שמור"
                  למטה בילבל מה כל אחד עושה (זה מוסיף פריט לתצוגה המקדימה,
                  "שמור" שומר את כל הרשימה הקבועה). */}
              <Button
                onClick={addItem}
                disabled={newItemText.trim().length < 2}
                startIcon={<AddRoundedIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                sx={{
                  background: newItemText.trim().length >= 2
                    ? 'linear-gradient(135deg, #14B8A6, #0D9488)'
                    : 'linear-gradient(135deg, #D1D5DB, #9CA3AF)',
                  color: 'white',
                  height: { xs: 34, sm: 40 },
                  '@media (max-width: 360px)': { height: 28 },
                  px: 1.5, minWidth: 0,
                  borderRadius: '10px',
                  textTransform: 'none', fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: newItemText.trim().length >= 2 ? '0 2px 6px rgba(20, 184, 166, 0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  '& .MuiButton-startIcon': { marginInlineEnd: 0.5 },
                  '&:hover': {
                    background: newItemText.trim().length >= 2
                      ? 'linear-gradient(135deg, #0D9488, #0F766E)'
                      : 'linear-gradient(135deg, #D1D5DB, #9CA3AF)',
                    boxShadow: newItemText.trim().length >= 2 ? '0 3px 10px rgba(20, 184, 166, 0.45)' : 'none'
                  },
                  '&:active': { transform: newItemText.trim().length >= 2 ? 'scale(0.96)' : 'none' },
                  '&.Mui-disabled': { color: 'white', opacity: 0.7 }
                }}
              >
                {t('add')}
              </Button>
            </InputAdornment>
          ),
        }}
      />

      <Button
        variant="contained"
        fullWidth
        disableElevation
        onClick={handleSave}
        disabled={!canSave}
        sx={{ py: 1.25, fontSize: 15, fontWeight: 600, borderRadius: '12px' }}
      >
        {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('save')}
      </Button>
    </Modal>
  );
};
