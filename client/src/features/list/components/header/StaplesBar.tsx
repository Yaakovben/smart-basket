import { memo, useState, useCallback, useMemo } from 'react';
import { Box, Chip, Typography, Button, CircularProgress } from '@mui/material';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import type { List } from '../../../../global/types';
import { Modal, ClearableTextField } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';

interface StaplesBarProps {
  list: List;
  staples?: string[];
  onQuickAdd?: (name: string) => void;
  onToggleStaple: (name: string) => Promise<void>;
}

// ===== שורת "מוצרים קבועים" - צ'יפים להוספה מהירה של מוצרים שהמשתמש
// תמיד קונה, בנוסף להוספה הרגילה (QuickAddBar/FAB). מציגה רק מוצרים
// קבועים שעדיין לא ברשימה הזו - אחרי הוספה הצ'יפ נעלם כי אין טעם להציע
// שוב מוצר שכבר נמצא. הצ'יפ האחרון תמיד "+ הוסף" לניהול הרשימה הקבועה. =====
export const StaplesBar = memo(({ list, staples = [], onQuickAdd, onToggleStaple }: StaplesBarProps) => {
  const { t } = useSettings();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingName, setRemovingName] = useState<string | null>(null);

  const availableStaples = useMemo(() => {
    const inList = new Set(list.products.map(p => p.name.trim().toLowerCase()));
    return staples.filter(s => !inList.has(s.trim().toLowerCase()));
  }, [staples, list.products]);

  const handleAddChipClick = useCallback((name: string) => {
    onQuickAdd?.(name);
  }, [onQuickAdd]);

  const handleRemoveStaple = useCallback(async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setRemovingName(name);
    try {
      await onToggleStaple(name);
    } finally {
      setRemovingName(null);
    }
  }, [onToggleStaple]);

  const handleSaveNewStaple = useCallback(async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2 || saving) return;
    setSaving(true);
    try {
      await onToggleStaple(trimmed);
      onQuickAdd?.(trimmed);
      setNewName('');
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  }, [newName, saving, onToggleStaple, onQuickAdd]);

  return (
    <>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        overflowX: 'auto', pb: 0.25,
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}>
        {availableStaples.map(name => (
          <Chip
            key={name}
            icon={<PushPinRoundedIcon sx={{ fontSize: 14 }} />}
            label={name}
            onClick={() => handleAddChipClick(name)}
            onDelete={(e) => handleRemoveStaple(e, name)}
            deleteIcon={removingName === name ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : undefined}
            size="small"
            sx={{
              flexShrink: 0,
              bgcolor: 'rgba(255,255,255,0.18)',
              color: 'white',
              fontWeight: 600,
              fontSize: 12.5,
              '& .MuiChip-icon': { color: 'rgba(255,255,255,0.85)' },
              '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.6)', fontSize: 16, '&:hover': { color: 'white' } },
            }}
          />
        ))}
        <Chip
          icon={<AddRoundedIcon sx={{ fontSize: 15 }} />}
          label={t('addStaple')}
          onClick={() => setShowAddModal(true)}
          size="small"
          sx={{
            flexShrink: 0,
            bgcolor: 'transparent',
            border: '1px dashed rgba(255,255,255,0.5)',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 600,
            fontSize: 12.5,
            '& .MuiChip-icon': { color: 'rgba(255,255,255,0.85)' },
          }}
        />
      </Box>

      {showAddModal && (
        <Modal title={t('addStaple')} onClose={() => !saving && setShowAddModal(false)}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5 }}>
            {t('addStapleHint')}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <ClearableTextField
              autoFocus
              fullWidth
              placeholder={t('productName')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onClear={() => setNewName('')}
              size="small"
            />
          </Box>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSaveNewStaple}
            disabled={newName.trim().length < 2 || saving}
            sx={{ py: 1.25, fontSize: 15 }}
          >
            {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('add')}
          </Button>
        </Modal>
      )}
    </>
  );
});

StaplesBar.displayName = 'StaplesBar';
