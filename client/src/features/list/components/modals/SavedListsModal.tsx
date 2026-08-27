import { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Chip, IconButton, Button } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BookmarkAddedRoundedIcon from '@mui/icons-material/BookmarkAddedRounded';
import type { SavedList } from '../../../../global/types';
import { Modal, ConfirmModal, ClearableTextField } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';
import { SAVED_LIST_EMOJIS, nameToSavedItem } from '../../helpers/savedList-helpers';

// ===== מודל ניהול "רשימות קבועות" =====
// נפתח מצ'יפ ⚙ בשורת SavedListsBar. עריכה מקומית (draft) עם flush לשרת:
// שינויים מבניים (מחיקה/הוספת פריט/הסרת פריט/אמוג׳י) נשמרים מיד; שינוי שם
// נשמר ב-blur. סגירת המודל שומרת כל שארית.
interface SavedListsModalProps {
  savedLists: SavedList[];
  onChange: (next: SavedList[]) => Promise<void>;
  onApply: (savedList: SavedList) => void;
  onClose: () => void;
}

export const SavedListsModal = ({ savedLists, onChange, onApply, onClose }: SavedListsModalProps) => {
  const { t } = useSettings();
  const [draft, setDraft] = useState<SavedList[]>(savedLists);
  const draftRef = useRef(draft);
  const savedRef = useRef(JSON.stringify(savedLists));
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const [expandedId, setExpandedId] = useState<string | null>(savedLists.length === 1 ? savedLists[0].id : null);
  const [pendingDelete, setPendingDelete] = useState<SavedList | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const persist = useCallback((next: SavedList[]) => {
    if (JSON.stringify(next) === savedRef.current) return;
    savedRef.current = JSON.stringify(next);
    void onChange(next);
  }, [onChange]);

  // flush שארית בסגירה / unmount
  useEffect(() => () => { persist(draftRef.current); }, [persist]);

  const mutate = useCallback((fn: (lists: SavedList[]) => SavedList[], commit = true) => {
    setDraft(prev => {
      const next = fn(prev);
      if (commit) persist(next);
      return next;
    });
  }, [persist]);

  const handleClose = useCallback(() => {
    persist(draftRef.current);
    onClose();
  }, [persist, onClose]);

  const renameLocal = (id: string, name: string) =>
    mutate(lists => lists.map(l => (l.id === id ? { ...l, name: name.slice(0, 40) } : l)), false);

  const cycleEmoji = (id: string) =>
    mutate(lists => lists.map(l => {
      if (l.id !== id) return l;
      const i = SAVED_LIST_EMOJIS.indexOf(l.emoji);
      return { ...l, emoji: SAVED_LIST_EMOJIS[(i + 1) % SAVED_LIST_EMOJIS.length] };
    }));

  const removeItem = (id: string, idx: number) =>
    mutate(lists => lists.map(l => (l.id === id ? { ...l, items: l.items.filter((_, i) => i !== idx) } : l)));

  const addItem = (id: string) => {
    const item = nameToSavedItem(newItemText);
    if (!item) return;
    setNewItemText('');
    mutate(lists => lists.map(l => {
      if (l.id !== id) return l;
      if (l.items.some(it => it.name.trim().toLowerCase() === item.name.toLowerCase())) return l;
      return { ...l, items: [...l.items, item] };
    }));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    mutate(lists => lists.filter(l => l.id !== id));
  };

  return (
    <>
      <Modal title={t('savedLists')} onClose={handleClose}>
        {draft.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <BookmarkAddedRoundedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
              {t('noSavedListsYet')}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              {t('noSavedListsDesc')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {draft.map(sl => {
              const open = expandedId === sl.id;
              return (
                <Box key={sl.id} sx={{ borderRadius: '14px', bgcolor: 'action.hover', overflow: 'hidden' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                    <Box
                      onClick={() => cycleEmoji(sl.id)}
                      sx={{
                        width: 36, height: 36, flexShrink: 0, borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, bgcolor: 'background.paper', cursor: 'pointer',
                        '&:active': { transform: 'scale(0.92)' }, transition: 'transform 0.12s',
                      }}
                      aria-label={t('chooseIcon')}
                    >
                      {sl.emoji}
                    </Box>
                    <ClearableTextField
                      value={sl.name}
                      onChange={e => renameLocal(sl.id, e.target.value)}
                      onClear={() => renameLocal(sl.id, '')}
                      onBlur={() => persist(draftRef.current)}
                      placeholder={t('savedListNameExample')}
                      variant="standard"
                      size="small"
                      sx={{ flex: 1, '& .MuiInput-input': { fontSize: 14, fontWeight: 600 } }}
                    />
                    <IconButton size="small" onClick={() => setPendingDelete(sl)} aria-label={t('delete')}>
                      <DeleteOutlineIcon sx={{ fontSize: 19, color: 'error.main' }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setExpandedId(open ? null : sl.id)}
                      aria-label={t('savedLists')}
                      sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                    >
                      <ExpandMoreRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Box>

                  {open && (
                    <Box sx={{ px: 1.25, pb: 1.25 }}>
                      {sl.items.length === 0 ? (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
                          {t('savedListNoItems')}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {sl.items.map((it, idx) => (
                            <Chip
                              key={`${it.name}-${idx}`}
                              label={it.name}
                              size="small"
                              onDelete={() => removeItem(sl.id, idx)}
                              sx={{ fontSize: 12, bgcolor: 'background.paper' }}
                            />
                          ))}
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        <ClearableTextField
                          value={newItemText}
                          onChange={e => setNewItemText(e.target.value)}
                          onClear={() => setNewItemText('')}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(sl.id); } }}
                          placeholder={t('savedListAddItemPlaceholder')}
                          size="small"
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => addItem(sl.id)}
                          aria-label={t('savedListAddItemPlaceholder')}
                          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                        >
                          <AddRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                      <Button
                        fullWidth
                        size="small"
                        onClick={() => { onApply(sl); handleClose(); }}
                        disabled={sl.items.length === 0}
                        sx={{ mt: 1, textTransform: 'none', fontSize: 13, fontWeight: 700 }}
                      >
                        {`${t('startFromSavedList')} · ${sl.items.length}`}
                      </Button>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Modal>

      {pendingDelete && (
        <ConfirmModal
          title={t('deleteSavedListConfirm')}
          message={`"${pendingDelete.emoji} ${pendingDelete.name}"`}
          confirmText={t('delete')}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
};
