import { useState, useCallback, useMemo } from 'react';
import { Box, Button, Chip, CircularProgress, Collapse } from '@mui/material';
import type { Product, SavedList } from '../../../../global/types';
import { Modal, ClearableTextField } from '../../../../global/components';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { SAVED_LIST_EMOJIS, newSavedListId, productsToSavedItems } from '../../helpers/savedList-helpers';

// ===== מודל "שמור כרשימה קבועה" =====
// מקפיא את המוצרים הנוכחיים של הרשימה כרשימה קבועה בעלת שם ואמוג׳י.
// נפתח מתפריט ה-⋮ של הרשימה (כשיש מוצרים). מינימום טקסט - כותרת, שורת
// אמוג׳י+שם, תצוגה מקדימה של הפריטים, כפתור שמירה.
interface SaveAsSavedListModalProps {
  defaultName: string;
  products: Product[];
  onSave: (savedList: SavedList) => Promise<void>;
  onClose: () => void;
}

export const SaveAsSavedListModal = ({ defaultName, products, onSave, onClose }: SaveAsSavedListModalProps) => {
  const { t } = useSettings();
  const [name, setName] = useState(defaultName.slice(0, 40));
  const [emoji, setEmoji] = useState(SAVED_LIST_EMOJIS[0]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => productsToSavedItems(products), [products]);
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
      {/* אמוג׳י (כפתור שפותח בורר) + שם, בשורה אחת */}
      <Box sx={{ display: 'flex', gap: 1, mb: emojiOpen ? 1 : 2 }}>
        <Box
          onClick={() => { haptic('light'); setEmojiOpen(o => !o); }}
          aria-label={t('chooseIcon')}
          sx={{
            width: 44, height: 44, flexShrink: 0, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, cursor: 'pointer', bgcolor: 'action.hover',
            border: '2px solid', borderColor: emojiOpen ? 'primary.main' : 'divider',
            '&:active': { transform: 'scale(0.92)' }, transition: 'all 0.12s',
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
          sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
        />
      </Box>

      <Collapse in={emojiOpen} unmountOnExit>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {SAVED_LIST_EMOJIS.map(e => (
            <Box
              key={e}
              onClick={() => { haptic('light'); setEmoji(e); setEmojiOpen(false); }}
              sx={{
                width: 36, height: 36, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, cursor: 'pointer',
                bgcolor: emoji === e ? 'rgba(20,184,166,0.15)' : 'action.hover',
                border: '2px solid', borderColor: emoji === e ? 'primary.main' : 'transparent',
                '&:active': { transform: 'scale(0.9)' }, transition: 'all 0.12s',
              }}
            >
              {e}
            </Box>
          ))}
        </Box>
      </Collapse>

      {/* תצוגה מקדימה: הצ'יפים שיישמרו, עם מונה */}
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mb: 2.5,
        maxHeight: 148, overflowY: 'auto', overscrollBehavior: 'contain',
        p: 1, borderRadius: '12px', bgcolor: 'action.hover',
      }}>
        <Box sx={{
          flexShrink: 0, minWidth: 22, height: 22, px: 0.75,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '999px', bgcolor: 'primary.main', color: 'white',
          fontSize: 11, fontWeight: 800,
        }}>
          {items.length}
        </Box>
        {items.map(it => (
          <Chip key={it.name} label={it.name} size="small" sx={{ fontSize: 11.5, bgcolor: 'background.paper' }} />
        ))}
      </Box>

      <Button
        variant="contained"
        fullWidth
        onClick={handleSave}
        disabled={!canSave}
        sx={{ py: 1.25, fontSize: 15 }}
      >
        {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('save')}
      </Button>
    </Modal>
  );
};
