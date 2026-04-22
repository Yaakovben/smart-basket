import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, TextField, Button, IconButton, CircularProgress, InputAdornment } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ClearIcon from '@mui/icons-material/Close';
import { Modal } from '../../global/components/Modal';
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
  // מצב אישור מחיקה פנימי - מזהה של ה-quote שממתין לאישור סופי
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    try {
      setSaving(true);
      haptic('light');
      const newQuote = await dailyFaithApi.create(trimmed);
      setQuotes((prev) => [newQuote, ...prev]);
      setText('');
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    haptic('light');
    setConfirmDeleteId(null);
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

  return (
    <Modal title={t('dailyFaithManagerTitle')} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

        {/* שורת סטטיסטיקה */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 0.25,
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
        </Box>

        {/* הוספת משפט חדש */}
        <Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              size="small"
              placeholder={t('dailyFaithPlaceholder')}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
              inputProps={{ maxLength: MAX_TEXT_LENGTH }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={saving || text.trim().length < 2}
              sx={{
                minWidth: 48, height: 48, borderRadius: '12px', p: 0, flexShrink: 0,
                background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                boxShadow: '0 3px 12px rgba(184,134,11,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #B8860B, #9C7209)' },
                '&.Mui-disabled': { background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
              }}
            >
              {saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <AddIcon />}
            </Button>
          </Box>
          {/* מונה תווים */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, px: 0.25 }}>
            <Typography sx={{ fontSize: 10.5, color: charCountColor, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {textCharCount} / {MAX_TEXT_LENGTH}
            </Typography>
          </Box>
        </Box>

        {/* חיפוש - רק אם יש מספר משפטים */}
        {quotes.length > 3 && (
          <TextField
            fullWidth
            size="small"
            placeholder="חיפוש משפט..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
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
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              },
            }}
          />
        )}

        {/* רשימת משפטים */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85, maxHeight: '50vh', overflowY: 'auto', pr: 0.25 }}>
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
              const isAwaitingConfirm = confirmDeleteId === q.id;
              return (
                <Box
                  key={q.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1.25,
                    borderRadius: '12px',
                    bgcolor: isAwaitingConfirm
                      ? (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)')
                      : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)'),
                    border: '1px solid',
                    borderColor: isAwaitingConfirm
                      ? 'rgba(239,68,68,0.35)'
                      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    transition: 'background 0.2s, border 0.2s',
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

                  {/* תוכן */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                      fontSize: 13.5, lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      color: 'text.primary',
                    }}>
                      {q.text}
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

                  {/* כפתור מחיקה עם אישור פנימי */}
                  {isAwaitingConfirm ? (
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <IconButton
                        size="small"
                        onClick={() => setConfirmDeleteId(null)}
                        sx={{
                          width: 30, height: 30,
                          color: 'text.secondary',
                          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        }}
                      >
                        <ClearIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                      <Button
                        size="small"
                        onClick={() => handleDelete(q.id)}
                        sx={{
                          minWidth: 0, px: 1, height: 30, borderRadius: '8px',
                          bgcolor: '#EF4444', color: 'white', fontSize: 11, fontWeight: 700,
                          '&:hover': { bgcolor: '#DC2626' },
                        }}
                      >
                        מחק
                      </Button>
                    </Box>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => setConfirmDeleteId(q.id)}
                      sx={{
                        color: 'text.secondary',
                        flexShrink: 0,
                        '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>
    </Modal>
  );
};
