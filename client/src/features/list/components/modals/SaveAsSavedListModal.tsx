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
      <Box sx={{ display: 'flex', gap: 1.25, mb: emojiOpen ? 1.5 : 2.5 }}>
        <Box
          onClick={() => { haptic('light'); setEmojiOpen(o => !o); }}
          aria-label={t('chooseIcon')}
          sx={{
            width: 46, height: 46, flexShrink: 0, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 23, cursor: 'pointer',
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
          sx={{ '& .MuiOutlinedInput-root': { height: 46 } }}
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

      {/* תצוגה מקדימה: הצ'יפים שיישמרו, עם מונה */}
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mb: 2.5,
        maxHeight: 156, overflowY: 'auto', overscrollBehavior: 'contain',
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
          <Chip key={it.name} label={it.name} sx={{ fontSize: 13, height: 30, bgcolor: 'action.hover' }} />
        ))}
      </Box>

      <Button
        variant="contained"
        fullWidth
        disableElevation
        onClick={handleSave}
        disabled={!canSave}
        sx={{ py: 1.2, fontSize: 15, fontWeight: 600, borderRadius: '12px' }}
      >
        {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('save')}
      </Button>
    </Modal>
  );
};
