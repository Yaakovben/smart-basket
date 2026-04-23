import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, TextField, Button, IconButton, CircularProgress, InputAdornment, Collapse } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ClearIcon from '@mui/icons-material/Close';
import { Modal } from '../../global/components/Modal';
import { ConfirmModal } from '../../global/components/ConfirmModal';
import { renderFaithText, stripFaithMarkers } from './formatFaithText';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';
import { dailyFaithApi, type DailyFaith } from './daily-faith.api';

interface Props {
  onClose: () => void;
}

const MAX_TEXT_LENGTH = 500;

// פורמט תאריך יחסי קצר - לתגית ליד כל משפט
const formatRelativeDate = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`;
  return `לפני ${Math.floor(days / 30)} חודשים`;
};

export const DailyFaithManager = ({ onClose }: Props) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [quotes, setQuotes] = useState<DailyFaith[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  // האם החיפוש פתוח (מוצג כ-input). כברירת מחדל סגור - רק אייקון חיפוש
  const [searchOpen, setSearchOpen] = useState(false);
  // ה-quote שממתין לאישור מחיקה ב-popup. null = אין מחיקה פתוחה.
  const [quoteToDelete, setQuoteToDelete] = useState<DailyFaith | null>(null);
  // מועמד לכפילות - מציג אישור להוסיף משפט למרות שקיים זהה
  const [duplicateCandidate, setDuplicateCandidate] = useState<{ attempted: string; existing: DailyFaith } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dailyFaithApi.getAll();
      setQuotes(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredQuotes = useMemo(() => {
    if (!search.trim()) return quotes;
    const q = search.trim().toLowerCase();
    return quotes.filter(x => x.text.toLowerCase().includes(q));
  }, [quotes, search]);

  // בדיקת כפילות - משווה טקסט בנורמליזציה (בלי סימוני bold, בלי רווחים סופיים, lowercase)
  const normalizeForCompare = useCallback((t: string) => {
    return stripFaithMarkers(t).replace(/\s+/g, ' ').trim().toLowerCase();
  }, []);

  const findDuplicate = useCallback((raw: string): DailyFaith | null => {
    const needle = normalizeForCompare(raw);
    if (!needle) return null;
    return quotes.find(q => normalizeForCompare(q.text) === needle) || null;
  }, [quotes, normalizeForCompare]);

  // ביצוע ההוספה בפועל - משותף לזרם רגיל ולאישור דריסה
  const performAdd = async (rawText: string) => {
    try {
      setSaving(true);
      haptic('light');
      const newQuote = await dailyFaithApi.create(rawText);
      setQuotes((prev) => [newQuote, ...prev]);
      setText('');
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    // בדיקת כפילות — אם קיים משפט זהה, מציגים popup אישור במקום להוסיף מייד
    const dup = findDuplicate(trimmed);
    if (dup) {
      setDuplicateCandidate({ attempted: trimmed, existing: dup });
      return;
    }
    await performAdd(trimmed);
  };

  const handleDelete = async (id: string) => {
    haptic('light');
    setQuoteToDelete(null);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    try {
      await dailyFaithApi.remove(id);
    } catch {
      load();
    }
  };

  // עיצוב משותף ל-TextField (חיפוש + הוספה)
  const textCharCount = text.length;
  const charCountColor = textCharCount >= MAX_TEXT_LENGTH * 0.9
    ? '#EF4444'
    : textCharCount >= MAX_TEXT_LENGTH * 0.75
      ? '#F59E0B'
      : 'text.disabled';

    // צביעה זהובה עקבית לכל ה-inputs (תואם לצבע של משפטי החיזוק)
    const goldFieldSx = {
      '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        bgcolor: isDark ? 'rgba(212,175,55,0.06)' : 'rgba(212,175,55,0.05)',
        '& fieldset': { borderColor: 'rgba(184,134,11,0.25)' },
        '&:hover fieldset': { borderColor: 'rgba(184,134,11,0.5)' },
        '&.Mui-focused fieldset': { borderColor: '#B8860B', borderWidth: '1.5px' },
      },
    };

    return (
    <Modal title={t('dailyFaithManagerTitle')} onClose={onClose}>
      {/* גובה קבוע — גם ברשימה ריקה וגם מלאה. מונע "קפיצה" של ה-popup */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        height: 'min(70vh, 580px)',
      }}>

        {/* שורת סטטיסטיקה + כפתור חיפוש (רק כשיש מספיק משפטים) */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 0.25, flexShrink: 0,
        }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            px: 1, py: 0.4, borderRadius: '8px',
            bgcolor: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(184,134,11,0.25)',
          }}>
            <AutoStoriesIcon sx={{ fontSize: 14, color: '#8B6914' }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#8B6914', letterSpacing: 0.3 }}>
              {quotes.length} {quotes.length === 1 ? 'משפט' : 'משפטים'}
            </Typography>
          </Box>
          {search && filteredQuotes.length !== quotes.length && (
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
              · מציג {filteredQuotes.length}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          {/* כפתור חיפוש - מופיע רק כשיש מספיק משפטים להצדיק זה */}
          {quotes.length > 3 && (
            <IconButton
              size="small"
              onClick={() => {
                const next = !searchOpen;
                setSearchOpen(next);
                if (!next) setSearch(''); // סגירה - מנקה גם את תוצאות הסינון
              }}
              sx={{
                width: 30, height: 30,
                color: searchOpen ? '#8B6914' : 'text.secondary',
                bgcolor: searchOpen
                  ? (isDark ? 'rgba(212,175,55,0.18)' : 'rgba(212,175,55,0.14)')
                  : 'transparent',
                border: '1px solid',
                borderColor: searchOpen ? 'rgba(184,134,11,0.4)' : 'transparent',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(212,175,55,0.14)' : 'rgba(212,175,55,0.1)',
                },
              }}
              aria-label="חיפוש"
            >
              <SearchIcon sx={{ fontSize: 17 }} />
            </IconButton>
          )}
        </Box>

        {/* כרטיס הוספת משפט חדש - מסגרת זהב עדינה שמפרידה ויזואלית מהרשימה */}
        <Box sx={{
          flexShrink: 0,
          p: 1.25,
          borderRadius: '14px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(184,134,11,0.03))'
            : 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(184,134,11,0.03))',
          border: '1px solid',
          borderColor: isDark ? 'rgba(184,134,11,0.25)' : 'rgba(184,134,11,0.2)',
        }}>
          {/* כותרת כרטיס */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.75, px: 0.25 }}>
            <Typography sx={{ fontSize: 14 }}>✍️</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#8B6914', letterSpacing: 0.3 }}>
              הוספת משפט חדש
            </Typography>
          </Box>

          {/* שדה טקסט ברוחב מלא */}
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={5}
            size="small"
            placeholder={t('dailyFaithPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
            onKeyDown={(e) => {
              // קיצור דרך: Ctrl/Cmd + Enter לשמירה מהירה
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && text.trim().length >= 2 && !saving) {
                e.preventDefault();
                handleAdd();
              }
            }}
            inputProps={{ maxLength: MAX_TEXT_LENGTH }}
            sx={{
              ...goldFieldSx,
              '& .MuiOutlinedInput-root': {
                ...goldFieldSx['& .MuiOutlinedInput-root'],
                bgcolor: 'background.paper',
              },
            }}
          />

          {/* רמז לפורמט bold */}
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.75, px: 0.25, lineHeight: 1.4 }}>
            💡 טיפ: עטוף מילה ב־<Box component="span" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.4, borderRadius: '3px' }}>*כוכביות*</Box> כדי להדגיש אותה (<Box component="span" sx={{ fontWeight: 800 }}>כמו ב-WhatsApp</Box>)
          </Typography>

          {/* שורה תחתונה: מונה תווים + כפתור הוספה */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography sx={{
              fontSize: 11, color: charCountColor, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums', flex: 1,
            }}>
              {textCharCount} / {MAX_TEXT_LENGTH} תווים
            </Typography>
            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={saving || text.trim().length < 2}
              startIcon={saving ? null : <AddIcon sx={{ fontSize: 18 }} />}
              sx={{
                minWidth: 110,
                height: 38,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 800,
                fontSize: 13,
                background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                boxShadow: '0 3px 12px rgba(184,134,11,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B8860B, #9C7209)',
                  boxShadow: '0 4px 14px rgba(184,134,11,0.45)',
                },
                '&.Mui-disabled': {
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  color: 'text.disabled',
                },
                '& .MuiButton-startIcon': { marginInlineStart: 0, marginInlineEnd: '4px' },
              }}
            >
              {saving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'הוסף משפט'}
            </Button>
          </Box>
        </Box>

        {/* חיפוש מתקפל - פתוח רק כשלוחצים על כפתור החיפוש */}
        <Collapse in={searchOpen && quotes.length > 3} unmountOnExit>
          <Box sx={{ flexShrink: 0, pt: 0.25 }}>
            <TextField
              fullWidth
              autoFocus
              size="small"
              placeholder="חיפוש משפט..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: '#8B6914', opacity: 0.7 }} />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.5 }}>
                      <ClearIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={goldFieldSx}
            />
          </Box>
        </Collapse>

        {/* רשימת משפטים — ממלאת את שאר החלל */}
        <Box sx={{
          display: 'flex', flexDirection: 'column', gap: 0.85,
          flex: 1, minHeight: 0,
          overflowY: 'auto', pr: 0.25,
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} sx={{ color: '#B8860B' }} />
            </Box>
          ) : filteredQuotes.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography sx={{ fontSize: 36, mb: 1 }}>{search ? '🔍' : '📖'}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13.5, fontWeight: 600 }}>
                {search ? 'לא נמצאו תוצאות' : t('dailyFaithEmpty')}
              </Typography>
              {search && (
                <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.5 }}>
                  נסה מילים אחרות
                </Typography>
              )}
            </Box>
          ) : (
            filteredQuotes.map((q, idx) => {
              return (
                <Box
                  key={q.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1.25,
                    borderRadius: '12px',
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  {/* מספר רץ */}
                  <Box sx={{
                    flexShrink: 0,
                    width: 24, height: 24, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: isDark ? 'rgba(184,134,11,0.2)' : 'rgba(184,134,11,0.12)',
                    color: '#8B6914',
                    fontSize: 10.5, fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    mt: 0.2,
                  }}>
                    {idx + 1}
                  </Box>

                  {/* תוכן - עם רנדור של bold (*word*) */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                      fontSize: 13.5, lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      color: 'text.primary',
                    }}>
                      {renderFaithText(q.text)}
                    </Typography>
                    {/* תאריך + אורך */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                        {formatRelativeDate(q.createdAt)}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>·</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                        {q.text.length} תווים
                      </Typography>
                    </Box>
                  </Box>

                  {/* כפתור מחיקה - לחיצה פותחת popup אישור */}
                  <IconButton
                    size="small"
                    onClick={() => setQuoteToDelete(q)}
                    sx={{
                      color: 'text.secondary',
                      flexShrink: 0,
                      '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* POPUP אישור מחיקה - מוצג רק כשנבחר משפט למחיקה */}
      {quoteToDelete && (
        <ConfirmModal
          title="מחיקת משפט"
          message={`האם למחוק את המשפט? פעולה זו לא ניתנת לביטול.\n\n"${quoteToDelete.text.slice(0, 120)}${quoteToDelete.text.length > 120 ? '…' : ''}"`}
          confirmText="מחק"
          onConfirm={() => handleDelete(quoteToDelete.id)}
          onCancel={() => setQuoteToDelete(null)}
        />
      )}

      {/* POPUP אזהרת כפילות - מופיע כשמנסים להוסיף משפט שכבר קיים */}
      {duplicateCandidate && (
        <ConfirmModal
          title="המשפט כבר קיים"
          message={`משפט זהה נמצא כבר ברשימה:\n\n"${duplicateCandidate.existing.text.slice(0, 150)}${duplicateCandidate.existing.text.length > 150 ? '…' : ''}"\n\nלהוסיף בכל זאת?`}
          confirmText="הוסף בכל זאת"
          onConfirm={async () => {
            const attempted = duplicateCandidate.attempted;
            setDuplicateCandidate(null);
            await performAdd(attempted);
          }}
          onCancel={() => setDuplicateCandidate(null)}
        />
      )}
    </Modal>
  );
};
