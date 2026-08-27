import { useState, useCallback, useMemo } from 'react';
import { Box, Typography, Button, Chip, CircularProgress } from '@mui/material';
import type { Product, SavedList } from '../../../../global/types';
import { Modal, ClearableTextField } from '../../../../global/components';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { SAVED_LIST_EMOJIS, newSavedListId, productsToSavedItems } from '../../helpers/savedList-helpers';

// ===== מודל "שמור כרשימה קבועה" =====
// מקפיא את המוצרים הנוכחיים של הרשימה כרשימה קבועה בעלת שם ואמוג׳י.
// נפתח מתפריט ה-⋮ של הרשימה (כשיש מוצרים).
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
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2 }}>
        {t('savedListSnapshotHint')}
      </Typography>

      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
        {t('savedListNameLabel')}
      </Typography>
      <ClearableTextField
        autoFocus
        fullWidth
        placeholder={t('savedListNameExample')}
        value={name}
        onChange={e => setName(e.target.value.slice(0, 40))}
        onClear={() => setName('')}
        size="small"
      />

      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.5, mt: 2 }}>
        {t('chooseIcon')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {SAVED_LIST_EMOJIS.map(e => (
          <Box
            key={e}
            onClick={() => { haptic('light'); setEmoji(e); }}
            sx={{
              width: 36, height: 36, borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, cursor: 'pointer',
              bgcolor: emoji === e ? 'rgba(20,184,166,0.15)' : 'action.hover',
              border: '2px solid',
              borderColor: emoji === e ? 'primary.main' : 'transparent',
              '&:active': { transform: 'scale(0.9)' },
              transition: 'all 0.12s ease',
            }}
          >
            {e}
          </Box>
        ))}
      </Box>

      {/* תצוגה מקדימה של מה שיישמר */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 0.75 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary' }}>
          {t('savedListSaveWhat')}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
          {`${items.length} ${t('items')}`}
        </Typography>
      </Box>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2.5,
        maxHeight: 132, overflowY: 'auto', overscrollBehavior: 'contain',
        p: 1, borderRadius: '12px', bgcolor: 'action.hover',
      }}>
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
