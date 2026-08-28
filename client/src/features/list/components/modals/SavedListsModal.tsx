import { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Chip, IconButton, Button, Collapse, TextField, InputAdornment } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import BookmarkAddedRoundedIcon from '@mui/icons-material/BookmarkAddedRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import type { SavedList } from '../../../../global/types';
import { Modal, ConfirmModal, ClearableTextField, IconTile } from '../../../../global/components';
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
  // רשימה שנוצרה הרגע (זרימת "צור רשימה קבועה חדשה" -> חוזרים לכאן במקום
  // לסגור הכל). לא נפתחת אוטומטית (זה בדיוק מה שהרגיש עמוס) - רק מסומנת
  // עם מסגרת מודגשת כדי שיהיה ברור איפה היא, פתיחה בפועל היא לחיצה מפורשת.
  initialFocusId?: string | null;
}

export const SavedListsModal = ({ savedLists, onChange, onApply, onClose, initialFocusId }: SavedListsModalProps) => {
  const { t } = useSettings();
  const [draft, setDraft] = useState<SavedList[]>(savedLists);
  const draftRef = useRef(draft);
  const savedJsonRef = useRef(JSON.stringify(savedLists));
  // השם התקין האחרון לכל רשימה - כדי לשחזר אם המשתמש מרוקן שדה ומאבד
  // פוקוס בלי להקליד חדש (שם ריק היה נמחק ע"י השרת בשקט). מתעדכן בכל
  // הקלדה תקינה ב-renameLocal.
  const lastGoodNames = useRef(new Map(savedLists.map(l => [l.id, l.name])));
  // כל הכרטיסים תמיד מתחילים סגורים - פתיחה היא תמיד לחיצה מפורשת, גם
  // כשיש רשימה קבועה יחידה וגם מיד אחרי יצירת רשימה חדשה (initialFocusId
  // עדיין מסמן אותה במסגרת מודגשת למטה, רק לא פותח אותה בכוח).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emojiOpenId, setEmojiOpenId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
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
    setEditingNameId(null);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const finishEditingName = () => { setEditingNameId(null); commitNames(); };

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
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <BookmarkAddedRoundedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
              {t('noSavedListsYet')}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 260, mx: 'auto', lineHeight: 1.6 }}>
              {t('noSavedListsDesc')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {draft.map(sl => {
              const open = expandedId === sl.id;
              // רשימה שנוצרה הרגע - מסגרת מודגשת כדי שיהיה ברור איפה היא
              // בין כל הכרטיסים הסגורים, בלי לפתוח אותה בכוח.
              const highlighted = open || sl.id === initialFocusId;
              return (
                <Box key={sl.id} sx={{
                  borderRadius: '14px', overflow: 'hidden',
                  border: '1px solid', borderColor: highlighted ? 'rgba(20,184,166,0.4)' : 'divider',
                  transition: 'border-color 0.15s',
                }}>
                  {/* ראש הכרטיס - כולו לחיץ פותח/סוגר. האמוג'י: כרטיס סגור -
                      לחיצה עליו רק פותחת את הכרטיס (כמו כל מקום אחר בראש),
                      בלי לגרור את בורר האמוג'י. רק כרטיס שכבר פתוח - לחיצה
                      על האמוג'י פותחת את הבורר. */}
                  <Box
                    onClick={() => toggleExpand(sl.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, cursor: 'pointer',
                      '&:active': { bgcolor: 'action.hover' }, transition: 'background-color 0.1s',
                    }}
                  >
                    <IconTile
                      emoji={sl.emoji}
                      seedId={sl.id}
                      size={36}
                      fontSize={19}
                      ariaLabel={t('chooseIcon')}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (open) {
                          setEmojiOpenId(id => (id === sl.id ? null : sl.id));
                        } else {
                          toggleExpand(sl.id);
                        }
                      }}
                      sx={{
                        border: '2px solid',
                        borderColor: emojiOpenId === sl.id ? 'primary.main' : 'transparent',
                      }}
                    />
                    {editingNameId === sl.id ? (
                      <ClearableTextField
                        value={sl.name}
                        onChange={e => renameLocal(sl.id, e.target.value)}
                        onClear={() => renameLocal(sl.id, '')}
                        onBlur={finishEditingName}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); finishEditingName(); } }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        variant="standard"
                        placeholder={t('savedListNameExample')}
                        sx={{ flex: 1, '& .MuiInput-input': { fontSize: 15.5, fontWeight: 600, py: '2px' } }}
                      />
                    ) : (
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          // כרטיס סגור: לחיצה על השם רק פותחת. פתוח: נכנסים לעריכה.
                          if (!open) toggleExpand(sl.id);
                          else setEditingNameId(sl.id);
                        }}
                        sx={{
                          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1,
                          cursor: open ? 'text' : 'pointer', borderRadius: '6px', px: 0.25, mx: -0.25,
                          '&:active': { bgcolor: 'action.hover' }, transition: 'background-color 0.1s',
                        }}
                      >
                        <Typography sx={{
                          minWidth: 0, fontSize: 15.5, fontWeight: 600, color: 'text.primary',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          // קו מקווקו מתחת לשם רק כשהכרטיס פתוח - בדיוק המצב
                          // שבו לחיצה כאן באמת נכנסת לעריכה (כרטיס סגור:
                          // לחיצה רק פותחת, לא עורכת - אין טעם לרמוז "ערוך").
                          ...(open && { borderBottom: '1.5px dashed', borderColor: 'text.disabled', pb: '1px' }),
                        }}>
                          {sl.name}
                        </Typography>
                        {/* עט מוצג רק כשהכרטיס פתוח - עדין (opacity חלקי) אבל
                            יחד עם הקו המקווקו למעלה, מספיק ברור שלחיצה כאן עורכת את השם. */}
                        {open && (
                          <EditRoundedIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0, opacity: 0.75 }} />
                        )}
                      </Box>
                    )}
                    <Box sx={{
                      flexShrink: 0, minWidth: 22, px: 0.7, borderRadius: '999px',
                      bgcolor: 'action.hover', color: 'text.secondary',
                      fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: '20px',
                    }}>
                      {sl.items.length}
                    </Box>
                    <ExpandMoreRoundedIcon
                      sx={{ fontSize: 22, color: 'text.disabled', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                    />
                  </Box>

                  {/* בורר אמוג'י - עצמאי מהרחבת הכרטיס, נפתח רק בלחיצה על
                      האייקון עצמו, בלי לגרור פתיחה של כל שאר הכרטיס. */}
                  <Collapse in={emojiOpenId === sl.id} unmountOnExit>
                    <Box sx={{ px: 1.5, pb: 1.25, pt: 0.25 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {SAVED_LIST_EMOJIS.map(e => (
                          <Box
                            key={e}
                            onClick={() => setEmoji(sl.id, e)}
                            sx={{
                              width: 38, height: 38, borderRadius: '10px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 18, cursor: 'pointer',
                              bgcolor: sl.emoji === e ? 'rgba(20,184,166,0.12)' : 'action.hover',
                              border: '1px solid',
                              borderColor: sl.emoji === e ? 'primary.main' : 'transparent',
                              '&:active': { transform: 'scale(0.9)' }, transition: 'all 0.12s',
                            }}
                          >
                            {e}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Collapse>

                  <Collapse in={open} unmountOnExit>
                    <Box sx={{ px: 1.5, pb: 1.5, pt: 0.75 }}>
                      {sl.items.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
                          {sl.items.map((it, idx) => (
                            <Chip
                              key={it.name}
                              label={it.name}
                              onDelete={() => removeItem(sl.id, idx)}
                              sx={{
                                fontSize: 13, height: 31, bgcolor: 'action.hover', pr: '2px',
                                '& .MuiChip-label': { pr: 0.5 },
                                '& .MuiChip-deleteIcon': {
                                  color: 'rgba(239,68,68,0.7)', fontSize: 15,
                                  m: 0, mr: '4px',
                                  borderRadius: '50%', bgcolor: 'rgba(239,68,68,0.1)',
                                  transition: 'all 0.12s',
                                  '&:hover': { color: 'white', bgcolor: 'error.main' },
                                },
                              }}
                            />
                          ))}
                        </Box>
                      )}
                      {/* הוספת מוצר - בסגנון "הוספה מהירה": מעוגל, רקע לבן,
                          צל עדין, וכפתור + מודגש בתוך השדה */}
                      <TextField
                        fullWidth
                        value={newItemText}
                        onChange={e => setNewItemText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(sl.id); } }}
                        placeholder={t('savedListAddItemPlaceholder')}
                        size="small"
                        inputProps={{ autoCapitalize: 'sentences', autoCorrect: 'off', spellCheck: false }}
                        sx={{
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
                              <IconButton
                                onClick={() => addItem(sl.id)}
                                disabled={newItemText.trim().length < 2}
                                aria-label={t('savedListAddItemPlaceholder')}
                                sx={{
                                  background: newItemText.trim().length >= 2
                                    ? 'linear-gradient(135deg, #14B8A6, #0D9488)'
                                    : 'linear-gradient(135deg, #D1D5DB, #9CA3AF)',
                                  color: 'white',
                                  width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 },
                                  '@media (max-width: 360px)': { width: 28, height: 28 },
                                  borderRadius: '10px',
                                  boxShadow: newItemText.trim().length >= 2 ? '0 2px 6px rgba(20, 184, 166, 0.35)' : 'none',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    background: newItemText.trim().length >= 2
                                      ? 'linear-gradient(135deg, #0D9488, #0F766E)'
                                      : 'linear-gradient(135deg, #D1D5DB, #9CA3AF)',
                                    boxShadow: newItemText.trim().length >= 2 ? '0 3px 10px rgba(20, 184, 166, 0.45)' : 'none'
                                  },
                                  '&:active': { transform: newItemText.trim().length >= 2 ? 'scale(0.92)' : 'none' },
                                  '&.Mui-disabled': { color: 'white', opacity: 0.7 }
                                }}
                              >
                                <AddRoundedIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.25 }}>
                        <Button
                          size="small"
                          onClick={() => setPendingDelete(sl)}
                          startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
                          sx={{
                            textTransform: 'none', fontSize: 13, fontWeight: 600, color: 'error.main',
                            px: 1.25, borderRadius: '10px', bgcolor: 'rgba(239,68,68,0.08)',
                            '&:hover': { bgcolor: 'rgba(239,68,68,0.14)' },
                          }}
                        >
                          {t('deleteSavedListAction')}
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        <Button
                          size="small"
                          onClick={() => { haptic('light'); onApply(sl); handleClose(); }}
                          disabled={sl.items.length === 0}
                          startIcon={<PlaylistAddRoundedIcon sx={{ fontSize: 18 }} />}
                          sx={{
                            textTransform: 'none', fontSize: 13, fontWeight: 700, borderRadius: '10px', px: 2, py: 0.6,
                            color: 'white',
                            background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                            boxShadow: '0 2px 8px rgba(20,184,166,0.35)',
                            '& .MuiButton-startIcon': { marginInlineEnd: '10px' },
                            '&:hover': {
                              background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                              boxShadow: '0 3px 10px rgba(20,184,166,0.45)',
                            },
                            '&:active': { transform: 'scale(0.96)' },
                            '&.Mui-disabled': {
                              background: 'linear-gradient(135deg, #D1D5DB, #9CA3AF)',
                              color: 'white', opacity: 0.7, boxShadow: 'none',
                            },
                          }}
                        >
                          {t('savedListApplyButton').replace('{count}', String(sl.items.length))}
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
          message={`"${pendingDelete.emoji} ${pendingDelete.name}" · ${pendingDelete.items.length} ${t('items')}`}
          confirmText={t('deleteSavedListAction')}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
};
