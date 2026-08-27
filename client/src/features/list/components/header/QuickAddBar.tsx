import { memo, useState, useCallback, useRef, useMemo } from 'react';
import { Box, TextField, IconButton, InputAdornment } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import type { List } from '../../../../global/types';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { useSpeechToText } from '../../hooks/useSpeechToText';

// ===== שורת הוספה מהירה - שדה טקסט + זיהוי קולי + הצעות השלמה =====
interface QuickAddBarProps {
  list: List;
  onQuickAdd?: (name: string) => void;
}

export const QuickAddBar = memo(({ list, onQuickAdd }: QuickAddBarProps) => {
  const { t, settings } = useSettings();
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isListening, micDenied, speechSupported, toggleSpeech } = useSpeechToText({
    language: settings.language,
    setValue: setQuickAddValue,
    onFinalResult: onQuickAdd,
  });

  // היסטוריית המוצרים נקראת ומפוענחת מ-localStorage פעם אחת בלבד (lazy init),
  // לא בכל הקשה כמו קודם. saveToHistory מעדכן את ה-state ואת האחסון יחד.
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('sb_product_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // סט השמות הקיימים ברשימה - נבנה מחדש רק כשהמוצרים משתנים, לא בכל הקשה
  const existingNames = useMemo(
    () => new Set(list.products.map(p => p.name.toLowerCase())),
    [list.products]
  );

  // הצעות השלמה אוטומטית מהמוצרים הקיימים
  const suggestions = useMemo(() => {
    const val = quickAddValue.trim().toLowerCase();
    if (val.length < 1) return [];
    // סינון הצעות שמתחילות עם הטקסט ולא קיימות ברשימה
    return history
      .filter(h => h.toLowerCase().startsWith(val) && !existingNames.has(h.toLowerCase()))
      .slice(0, 5);
  }, [quickAddValue, existingNames, history]);

  // שמירת מוצר בהיסטוריה להשלמה אוטומטית
  const saveToHistory = useCallback((name: string) => {
    setHistory(prev => {
      const lower = name.toLowerCase();
      if (prev.some(h => h.toLowerCase() === lower)) return prev;
      const next = [name, ...prev].slice(0, 100);
      try { localStorage.setItem('sb_product_history', JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }, []);

  const handleQuickAddButton = useCallback(() => {
    const trimmed = quickAddValue.trim();
    if (trimmed.length < 2 || !onQuickAdd) return;

    haptic('light');
    saveToHistory(trimmed);
    onQuickAdd(trimmed);
    setQuickAddValue('');
    setShowSuggestions(false);
    inputRef.current?.blur();
  }, [quickAddValue, onQuickAdd, saveToHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = quickAddValue.trim();
      if (trimmed.length < 2 || !onQuickAdd) return;
      saveToHistory(trimmed);
      setShowSuggestions(false);

      haptic('light');
      onQuickAdd(trimmed);
      setQuickAddValue('');
      // לא לסגור מקלדת - ממשיכים להוסיף
    }
  }, [quickAddValue, onQuickAdd, saveToHistory]);

  return (
    <Box sx={{ mb: { xs: 1, sm: 1.5 }, position: 'relative', '@media (max-width: 360px)': { mb: 0.5 } }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        placeholder={t('quickAddPlaceholder')}
        value={quickAddValue}
        onChange={(e) => { setQuickAddValue(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onKeyDown={handleKeyDown}
        size="small"
        inputProps={{
          autoCapitalize: 'sentences',
          autoCorrect: 'off',
          spellCheck: false
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
            borderRadius: '14px',
            height: { xs: 44, sm: 52 },
            pr: 0.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&.Mui-focused': {
              boxShadow: '0 0 0 3px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.1)'
            }
          },
          '& .MuiOutlinedInput-input': {
            fontSize: 16, // Prevents iOS zoom on focus
            py: 1.5,
            color: 'text.primary'
          },
          '@media (max-width: 360px)': {
            '& .MuiOutlinedInput-root': { height: 38 },
            '& .MuiOutlinedInput-input': { py: 0.75 },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Box sx={{ fontSize: 20 }}>🛒</Box>
            </InputAdornment>
          ),
          endAdornment: (() => {
            const ready = quickAddValue.trim().length >= 2;
            return (
              <InputAdornment position="end" sx={{ gap: 0.25 }}>
                {quickAddValue.length > 2 && (
                  <IconButton
                    onClick={() => { haptic('light'); setQuickAddValue(''); }}
                    size="small"
                    sx={{ color: 'text.secondary', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}
                    aria-label={t('close')}
                    tabIndex={-1}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
                {speechSupported && (!ready || isListening) && (
                  <IconButton
                    onClick={toggleSpeech}
                    sx={{
                      width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 },
                      '@media (max-width: 360px)': { width: 28, height: 28 },
                      borderRadius: '10px',
                      color: isListening ? 'white' : micDenied ? 'text.disabled' : 'text.secondary',
                      background: isListening ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'action.hover',
                      opacity: micDenied ? 0.5 : 1,
                      animation: isListening ? 'pulse 1.5s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
                        '50%': { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
                      },
                      transition: 'all 0.2s ease',
                      '&:active': { transform: 'scale(0.92)' },
                    }}
                  >
                    {isListening ? <MicOffIcon sx={{ fontSize: { xs: 18, sm: 20 } }} /> : <MicIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
                  </IconButton>
                )}
                <IconButton
                  onClick={handleQuickAddButton}
                  disabled={!ready}
                  sx={{
                    background: ready
                      ? 'linear-gradient(135deg, #14B8A6, #0D9488)'
                      : 'linear-gradient(135deg, #D1D5DB, #9CA3AF)',
                    color: 'white',
                    width: { xs: 34, sm: 40 }, height: { xs: 34, sm: 40 },
                    '@media (max-width: 360px)': { width: 28, height: 28 },
                    borderRadius: '10px',
                    boxShadow: ready ? '0 2px 6px rgba(20, 184, 166, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: ready
                        ? 'linear-gradient(135deg, #0D9488, #0F766E)'
                        : 'linear-gradient(135deg, #D1D5DB, #9CA3AF)',
                      boxShadow: ready ? '0 3px 10px rgba(20, 184, 166, 0.45)' : 'none'
                    },
                    '&:active': { transform: ready ? 'scale(0.92)' : 'none' },
                    '&.Mui-disabled': { color: 'white', opacity: 0.7 }
                  }}
                  aria-label={t('add')}
                >
                  <AddIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
                </IconButton>
              </InputAdornment>
            );
          })(),
          'aria-label': t('quickAddPlaceholder')
        }}
      />
      {/* הצעות השלמה אוטומטית */}
      {showSuggestions && suggestions.length > 0 && (
        <Box sx={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          bgcolor: 'background.paper', borderRadius: '0 0 14px 14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          overflow: 'hidden', mt: -0.5,
        }}>
          {suggestions.map((s, i) => (
            <Box
              key={i}
              onMouseDown={(e) => { e.preventDefault(); setQuickAddValue(s); setShowSuggestions(false); if (onQuickAdd) { saveToHistory(s); onQuickAdd(s); setQuickAddValue(''); } }}
              sx={{
                px: 2, py: 1.25, cursor: 'pointer',
                fontSize: 14, color: 'text.primary',
                borderTop: i > 0 ? '1px solid' : 'none', borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
                '&:active': { bgcolor: 'action.selected' },
              }}
            >
              {s}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
});
QuickAddBar.displayName = 'QuickAddBar';
