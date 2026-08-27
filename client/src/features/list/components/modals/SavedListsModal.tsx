import { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Chip, IconButton, Button, Collapse } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import BookmarkAddedRoundedIcon from '@mui/icons-material/BookmarkAddedRounded';
import type { SavedList } from '../../../../global/types';
import { Modal, ConfirmModal, ClearableTextField } from '../../../../global/components';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { SAVED_LIST_EMOJIS, MAX_SAVED_LIST_ITEMS, nameToSavedItem } from '../../helpers/savedList-helpers';

// ===== מודל ניהול "רשימות קבועות" =====
// נפתח מתפריט ה-⋮ ("רשימות קבועות"). עריכה מקומית (draft) עם flush לשרת:
// שינויים מבניים (מחיקה / הוספת פריט / הסרת פריט / אמוג׳י) נשמרים מיד;
// שינוי שם נשמר ב-blur; סגירת המודל שומרת כל שארית.
interface SavedListsModalProps {
  savedLists: SavedList[];
  onChange: (next: SavedList[]) => Promise<void> | void;
  onApply: (savedList: SavedList) => void;
  onClose: () => void;
}

export const SavedListsModal = ({ savedLists, onChange, onApply, onClose }: SavedListsModalProps) => {
  const { t } = useSettings();
  const [draft, setDraft] = useState<SavedList[]>(savedLists);
  const draftRef = useRef(draft);
  const savedJsonRef = useRef(JSON.stringify(savedLists));
  // השם התקין האחרון לכל רשימה - כדי לשחזר אם המשתמש מרוקן שדה ומאבד
  // פוקוס בלי להקליד חדש (שם ריק היה נמחק ע"י השרת בשקט). מתעדכן בכל
  // הקלדה תקינה ב-renameLocal.
  const lastGoodNames = useRef(new Map(savedLists.map(l => [l.id, l.name])));
  const [expandedId, setExpandedId] = useState<string | null>(savedLists.length === 1 ? savedLists[0].id : null);
  const [emojiOpenId, setEmojiOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedList | null>(null);
  const [newItemText, setNewItemText] = useState('');

  const persist = useCallback((next: SavedList[]) => {
    const json = JSON.stringify(next);
    if (json === savedJsonRef.current) return;
    savedJsonRef.current = json;
    void onChange(next);
  }, [onChange]);

  // מחיל שינוי על ה-draft (state + ref מסונכרן) ואופציונלית שומר מיד.
  const apply = useCallback((producer: (lists: SavedList[]) => SavedList[], persistNow: boolean) => {
    const next = producer(draftRef.current);
    draftRef.current = next;
    setDraft(next);
    if (persistNow) persist(next);
  }, [persist]);

  // החזרת שם ריק לערכו התקין האחרון (שם ריק היה נמחק ע"י השרת בשקט).
  const withNamesFixed = useCallback((lists: SavedList[]) =>
    lists.map(l => (l.name.trim() ? l : { ...l, name: lastGoodNames.current.get(l.id) ?? l.name })),
  []);

  // מתקן שמות ריקים ואז שומר - משמש ב-blur וב-close (מעדכן גם את ה-UI).
  const commitNames = useCallback(() => apply(withNamesFixed, true), [apply, withNamesFixed]);

  // flush שארית (שינויי שם שלא עברו blur) ב-unmount - בלי setState.
  useEffect(() => () => persist(withNamesFixed(draftRef.current)), [persist, withNamesFixed]);

  const handleClose = useCallback(() => {
    commitNames();
    onClose();
  }, [commitNames, onClose]);

  const toggleExpand = (id: string) => {
    setNewItemText('');
    setEmojiOpenId(null);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const renameLocal = (id: string, name: string) => {
    const clipped = name.slice(0, 40);
    if (clipped.trim()) lastGoodNames.current.set(id, clipped);
    apply(lists => lists.map(l => (l.id === id ? { ...l, name: clipped } : l)), false);
  };

  const setEmoji = (id: string, emoji: string) => {
    haptic('light');
    setEmojiOpenId(null);
    apply(lists => lists.map(l => (l.id === id ? { ...l, emoji } : l)), true);
  };

  const removeItem = (id: string, idx: number) =>
    apply(lists => lists.map(l => (l.id === id ? { ...l, items: l.items.filter((_, i) => i !== idx) } : l)), true);

  const addItem = (id: string) => {
    const item = nameToSavedItem(newItemText);
    if (!item) return;
    setNewItemText('');
    const target = draftRef.current.find(l => l.id === id);
    if (!target || target.items.length >= MAX_SAVED_LIST_ITEMS) return;
    if (target.items.some(it => it.name.trim().toLowerCase() === item.name.toLowerCase())) return;
    apply(lists => lists.map(l => (l.id === id ? { ...l, items: [...l.items, item] } : l)), true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    apply(lists => lists.filter(l => l.id !== id), true);
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {draft.map(sl => {
              const open = expandedId === sl.id;
              return (
                <Box key={sl.id} sx={{ borderRadius: '14px', bgcolor: 'action.hover', overflow: 'hidden' }}>
                  {/* ראש הכרטיס - כולו לחיץ פותח/סוגר; האמוג׳י פותח בורר אמוג׳י */}
                  <Box
                    onClick={() => toggleExpand(sl.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, p: 1, cursor: 'pointer',
                      '&:active': { bgcolor: 'action.selected' }, transition: 'background-color 0.1s',
                    }}
                  >
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(sl.id);
                        setEmojiOpenId(id => (id === sl.id ? null : sl.id));
                      }}
                      aria-label={t('chooseIcon')}
                      sx={{
                        width: 34, height: 34, flexShrink: 0, borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, bgcolor: 'background.paper', cursor: 'pointer',
                        border: '2px solid', borderColor: emojiOpenId === sl.id ? 'primary.main' : 'transparent',
                        '&:active': { transform: 'scale(0.9)' }, transition: 'all 0.12s',
                      }}
                    >
                      {sl.emoji}
                    </Box>
                    <Typography sx={{
                      flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'text.primary',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {sl.name}
                    </Typography>
                    <Box sx={{
                      flexShrink: 0, minWidth: 20, px: 0.6, borderRadius: '999px',
                      bgcolor: 'background.paper', color: 'text.secondary',
                      fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: '18px',
                    }}>
                      {sl.items.length}
                    </Box>
                    <ExpandMoreRoundedIcon
                      sx={{ fontSize: 22, color: 'text.secondary', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                    />
                  </Box>

                  <Collapse in={open} unmountOnExit>
                    <Box sx={{ px: 1.25, pb: 1.25 }}>
                      <ClearableTextField
                        value={sl.name}
                        onChange={e => renameLocal(sl.id, e.target.value)}
                        onClear={() => renameLocal(sl.id, '')}
                        onBlur={commitNames}
                        placeholder={t('savedListNameExample')}
                        size="small"
                        fullWidth
                        sx={{ mb: 1.25, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                      />

                      <Collapse in={emojiOpenId === sl.id} unmountOnExit>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
                          {SAVED_LIST_EMOJIS.map(e => (
                            <Box
                              key={e}
                              onClick={() => setEmoji(sl.id, e)}
                              sx={{
                                width: 34, height: 34, borderRadius: '9px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 17, cursor: 'pointer',
                                bgcolor: sl.emoji === e ? 'rgba(20,184,166,0.15)' : 'background.paper',
                                border: '2px solid',
                                borderColor: sl.emoji === e ? 'primary.main' : 'transparent',
                                '&:active': { transform: 'scale(0.9)' }, transition: 'all 0.12s',
                              }}
                            >
                              {e}
                            </Box>
                          ))}
                        </Box>
                      </Collapse>

                      {sl.items.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {sl.items.map((it, idx) => (
                            <Chip
                              key={it.name}
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
                          sx={{ flex: 1, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => addItem(sl.id)}
                          aria-label={t('savedListAddItemPlaceholder')}
                          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, flexShrink: 0 }}
                        >
                          <AddRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
                        <IconButton
                          size="small"
                          onClick={() => setPendingDelete(sl)}
                          aria-label={t('delete')}
                          sx={{ color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)', '&:hover': { bgcolor: 'rgba(239,68,68,0.16)' } }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 19 }} />
                        </IconButton>
                        <Box sx={{ flex: 1 }} />
                        <Button
                          size="small"
                          variant="contained"
                          disableElevation
                          onClick={() => { haptic('light'); onApply(sl); handleClose(); }}
                          disabled={sl.items.length === 0}
                          startIcon={<PlaylistAddRoundedIcon sx={{ fontSize: 17 }} />}
                          sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, borderRadius: '10px' }}
                        >
                          {t('savedListAddToList')}
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>
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
