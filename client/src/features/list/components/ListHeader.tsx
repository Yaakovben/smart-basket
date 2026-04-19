import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Box, Typography, TextField, IconButton, Tabs, Tab, InputAdornment, Collapse, CircularProgress, keyframes } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { List, User } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { COMMON_STYLES, haptic } from '../../../global/helpers';
import { MembersButton, ListMenu } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ListFilter } from '../types/list-types';

// ===== אנימציות בר התקדמות =====
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 4px rgba(34, 197, 94, 0.4), 0 0 8px rgba(34, 197, 94, 0.2); }
  50% { box-shadow: 0 0 8px rgba(34, 197, 94, 0.6), 0 0 16px rgba(34, 197, 94, 0.3); }
`;

const checkBounce = keyframes`
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); opacity: 1; }
`;

// ===== סגנונות =====
const glassButtonSx = COMMON_STYLES.glassIconButton;

// ===== פונקציית זמן יחסי =====
const getTimeAgo = (dateStr: string | undefined, t: (key: TranslationKeys) => string): string => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('agoMinutes').replace('{n}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('agoHours').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  return t('agoDays').replace('{n}', String(days));
};

// ===== Props =====
interface ListHeaderProps {
  list: List;
  user: User;
  filter: ListFilter;
  search: string;
  pendingCount: number;
  purchasedCount: number;
  allMembers: User[];
  isOwner: boolean;
  onBack: () => void;
  onFilterChange: (filter: ListFilter) => void;
  onSearchChange: (search: string) => void;
  onEditList: () => void;
  onDeleteList: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  mainNotificationsOff: boolean;
  onShareList: () => void;
  onShowMembers: () => void;
  onShowInvite: () => void;
  onQuickAdd?: (name: string) => void;
  onlineUserIds?: Set<string>;
  onRefresh: () => void;
  refreshing?: boolean;
  onClearList?: () => void;
  onResetList?: () => void;
  hasPurchased?: boolean;
  hasProducts?: boolean;
  onLeave?: () => void;
}

// ===== קומפוננטה =====
export const ListHeader = memo(({
  list,
  user,
  filter,
  search,
  pendingCount,
  purchasedCount,
  allMembers,
  isOwner,
  onBack,
  onFilterChange,
  onSearchChange,
  onEditList,
  onDeleteList,
  onToggleMute,
  isMuted,
  mainNotificationsOff,
  onShareList,
  onShowMembers,
  onShowInvite,
  onQuickAdd,
  onlineUserIds,
  onRefresh,
  refreshing = false,
  onClearList,
  onResetList,
  hasPurchased = false,
  hasProducts = false,
  onLeave
}: ListHeaderProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // הצעות השלמה אוטומטית מהמוצרים הקיימים
  const suggestions = useMemo(() => {
    const val = quickAddValue.trim().toLowerCase();
    if (val.length < 1) return [];
    const existing = new Set(list.products.map(p => p.name.toLowerCase()));
    // היסטוריית מוצרים מ-localStorage
    let history: string[] = [];
    try {
      const stored = localStorage.getItem('sb_product_history');
      if (stored) history = JSON.parse(stored);
    } catch { /* */ }
    // סינון הצעות שמתחילות עם הטקסט ולא קיימות ברשימה
    return history
      .filter(h => h.toLowerCase().startsWith(val) && !existing.has(h.toLowerCase()))
      .slice(0, 5);
  }, [quickAddValue, list.products]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // זיהוי קולי - רק Chrome/Edge/Android, לא Safari/iOS (מדווח תמיכה אבל לא עובד)
  const isApple = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || /^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  const SpeechRecognitionClass = !isApple && typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const speechSupported = !!SpeechRecognitionClass;

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const toggleSpeech = useCallback(() => {
    if (micDenied) {
      alert(settings.language === 'he'
        ? 'הגישה למיקרופון נחסמה.\nכדי לאפשר:\n1. לחץ על סמל המנעול ליד כתובת האתר\n2. הרשאות ← מיקרופון ← אפשר\n3. רענן את הדף'
        : settings.language === 'ru'
        ? 'Доступ к микрофону заблокирован.\nЧтобы разрешить:\n1. Нажмите на значок замка рядом с URL\n2. Разрешения → Микрофон → Разрешить\n3. Обновите страницу'
        : 'Microphone access was blocked.\nTo allow:\n1. Click the lock icon near the URL\n2. Permissions → Microphone → Allow\n3. Refresh the page');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    if (!SpeechRecognitionClass) return;
    recognitionRef.current?.abort();

    const recognition = new SpeechRecognitionClass();
    recognition.lang = settings.language === 'he' ? 'he-IL' : settings.language === 'ru' ? 'ru-RU' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0];
      const text = result?.[0]?.transcript?.trim();
      if (!text) return;
      // הצגת טקסט בזמן אמת
      setQuickAddValue(text);
      // הוספה אוטומטית רק כשהתוצאה סופית
      if (result.isFinal && text.length >= 2 && onQuickAdd) {
        setTimeout(() => {
          onQuickAdd(text);
          setQuickAddValue('');
          haptic('light');
        }, 200);
      }
    };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onerror = (event: Event) => {
      setIsListening(false);
      recognitionRef.current = null;
      const error = (event as { error?: string }).error;
      if (error === 'not-allowed') {
        setMicDenied(true);
        alert(settings.language === 'he'
          ? 'הגישה למיקרופון נחסמה.\nכדי לאפשר:\n1. לחץ על סמל המנעול ליד כתובת האתר\n2. הרשאות ← מיקרופון ← אפשר\n3. רענן את הדף'
          : 'Microphone access was blocked.\nTo allow:\n1. Click the lock icon near the URL\n2. Permissions → Microphone → Allow\n3. Refresh the page');
      } else if (error === 'network') {
        alert(settings.language === 'he' ? 'שגיאת רשת. בדוק חיבור לאינטרנט' : 'Network error. Check internet connection');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      haptic('medium');
    } catch {
      setMicDenied(true);
    }
  }, [isListening, micDenied, settings.language, onQuickAdd, SpeechRecognitionClass]);

  const handleToggleSearch = useCallback(() => {
    if (showSearch) {
      setShowSearch(false);
      onSearchChange('');
    } else {
      setShowSearch(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch, onSearchChange]);

  // שמירת מוצר בהיסטוריה להשלמה אוטומטית
  const saveToHistory = useCallback((name: string) => {
    try {
      const stored = localStorage.getItem('sb_product_history');
      const history: string[] = stored ? JSON.parse(stored) : [];
      const lower = name.toLowerCase();
      if (!history.some(h => h.toLowerCase() === lower)) {
        history.unshift(name);
        if (history.length > 100) history.pop();
        localStorage.setItem('sb_product_history', JSON.stringify(history));
      }
    } catch { /* */ }
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
  }, [quickAddValue, onQuickAdd]);

  return (
    <Box sx={{
      background: isDark ? 'linear-gradient(135deg, #0D9488, #047857)' : 'linear-gradient(135deg, #14B8A6, #0D9488)',
      p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 14px 14px', sm: '48px 20px 20px' },
      borderRadius: { xs: '0 0 20px 20px', sm: '0 0 24px 24px' },
      flexShrink: 0,
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(79, 70, 229, 0.15)'
    }}>
      {/* Title Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1, sm: 2 } }}>
        <IconButton
          onClick={onBack}
          sx={glassButtonSx}
          aria-label={t('back')}
        >
          <ArrowForwardIcon sx={{ color: 'white', fontSize: 22 }} />
        </IconButton>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography sx={{ color: 'white', fontSize: { xs: 18, sm: 20 }, fontWeight: 700, textAlign: 'center' }}>
            {list.name}
          </Typography>
          {refreshing && <CircularProgress size={18} sx={{ color: 'white' }} />}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <IconButton
            onClick={onShareList}
            sx={glassButtonSx}
            aria-label={t('shareList')}
          >
            <ShareIcon sx={{ color: 'white', fontSize: 22 }} />
          </IconButton>
          <IconButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={glassButtonSx}
            aria-label={t('groupSettings')}
          >
            <MoreVertIcon sx={{ color: 'white', fontSize: 22 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Options Menu */}
      <ListMenu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        isGroup={list.isGroup}
        isOwner={isOwner}
        isMuted={isMuted}
        mainNotificationsOff={mainNotificationsOff}
        onToggleMute={onToggleMute}
        onEdit={onEditList}
        onDelete={onDeleteList}
        onRefresh={onRefresh}
        onClearList={onClearList}
        onResetList={onResetList}
        hasPurchased={hasPurchased}
        hasProducts={hasProducts}
        onLeave={onLeave}
      />

      {/* Members Row (Group Only) */}
      {list.isGroup && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1, sm: 1.5 } }}>
          <MembersButton members={allMembers} currentUserId={user.id} onClick={onShowMembers} onlineUserIds={onlineUserIds} />
          <IconButton
            onClick={onShowInvite}
            sx={glassButtonSx}
            aria-label={t('inviteFriends')}
          >
            <PersonAddIcon sx={{ color: 'white', fontSize: 22 }} />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          <IconButton
            onClick={handleToggleSearch}
            sx={{
              ...glassButtonSx,
              bgcolor: showSearch ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.2s ease'
            }}
            aria-label={showSearch ? t('close') : t('search')}
          >
            {showSearch ? (
              <SearchOffIcon sx={{ color: 'white', fontSize: 22 }} />
            ) : (
              <SearchIcon sx={{ color: 'white', fontSize: 22 }} />
            )}
          </IconButton>
        </Box>
      )}

      {/* Search Button Row (Private Lists Only) */}
      {!list.isGroup && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: { xs: 1, sm: 1.5 } }}>
          <IconButton
            onClick={handleToggleSearch}
            sx={{
              ...glassButtonSx,
              bgcolor: showSearch ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.2s ease'
            }}
            aria-label={showSearch ? t('close') : t('search')}
          >
            {showSearch ? (
              <SearchOffIcon sx={{ color: 'white', fontSize: 22 }} />
            ) : (
              <SearchIcon sx={{ color: 'white', fontSize: 22 }} />
            )}
          </IconButton>
        </Box>
      )}

      {/* Search Row */}
      <Collapse in={showSearch}>
        <Box sx={{ mb: 1.5 }}>
          <TextField
            inputRef={searchInputRef}
            fullWidth
            placeholder={t('searchProducts')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: '14px',
                height: 48,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&.Mui-focused': {
                  boxShadow: '0 0 0 3px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.1)'
                }
              },
              '& .MuiOutlinedInput-input': {
                fontSize: 16,
                color: 'text.primary'
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => onSearchChange('')}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                    aria-label={t('close')}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
        </Box>
      </Collapse>

      {/* Quick Add - Mobile First Design */}
      <Box sx={{ mb: { xs: 1, sm: 1.5 }, position: 'relative' }}>
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
              height: { xs: 46, sm: 52 },
              pr: 0.75,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              '&.Mui-focused': {
                boxShadow: '0 0 0 3px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.1)'
              }
            },
            '& .MuiOutlinedInput-input': {
              fontSize: 16, // Prevents iOS zoom on focus
              py: 1.5,
              color: 'text.primary'
            }
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
                <InputAdornment position="end" sx={{ gap: 0.5 }}>
                  {speechSupported && (!ready || isListening) && (
                    <IconButton
                      onClick={toggleSpeech}
                      sx={{
                        width: 40, height: 40,
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
                      {isListening ? <MicOffIcon sx={{ fontSize: 20 }} /> : <MicIcon sx={{ fontSize: 20 }} />}
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
                      width: 40, height: 40,
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
                    <AddIcon sx={{ fontSize: 22 }} />
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

      {/* Filter Tabs - Larger Touch Targets */}
      <Tabs
        value={filter}
        onChange={(_, v) => onFilterChange(v)}
        variant="fullWidth"
        aria-label={t('toBuy')}
        sx={{
          bgcolor: 'rgba(255,255,255,0.15)',
          borderRadius: '14px',
          p: 0.75,
          minHeight: 'auto',
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            borderRadius: '10px',
            py: { xs: 1, sm: 1.5 },
            px: 2,
            minHeight: { xs: 42, sm: 48 },
            fontSize: { xs: 14, sm: 15 },
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'none',
            '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main' }
          }
        }}
      >
        <Tab value="pending" label={`${t('toBuy')} (${pendingCount})`} />
        <Tab value="purchased" label={`${t('purchased')} (${purchasedCount})`} />
      </Tabs>

      {/* סטטוס: זמן עדכון + בר התקדמות */}
      {(list.updatedAt || (pendingCount + purchasedCount) > 0) && (() => {
        const total = pendingCount + purchasedCount;
        const percent = total > 0 ? Math.round((purchasedCount / total) * 100) : 0;
        const isComplete = percent === 100;

        // גרדיאנט דינמי לפי אחוז השלמה - ניגודיות חזקה על רקע טורקיז
        const barGradient = isComplete
          ? 'linear-gradient(90deg, #22C55E, #4ADE80, #86EFAC)'
          : percent >= 75
            ? 'linear-gradient(90deg, #FBBF24, #FDE68A, #FEF9C3)'
            : percent >= 50
              ? 'linear-gradient(90deg, #F97316, #FB923C, #FBBF24)'
              : percent >= 25
                ? 'linear-gradient(90deg, #EF4444, #F97316, #FB923C)'
                : 'linear-gradient(90deg, #DC2626, #EF4444, #F87171)';

        // צבע טקסט לפי אחוז - בולט על רקע טורקיז
        const textColor = isComplete
          ? '#86EFAC'
          : percent >= 75 ? '#FDE68A'
          : percent >= 50 ? '#FDBA74'
          : percent >= 25 ? '#FCA5A5'
          : '#FCA5A5';

        return (
          <Box sx={{ mt: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
              {list.updatedAt && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <AccessTimeIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                    {t('updated')} {getTimeAgo(list.updatedAt, t)}
                  </Typography>
                </Box>
              )}
              {total > 0 && (
                <Typography sx={{
                  color: textColor,
                  fontSize: 11,
                  fontWeight: 700,
                  transition: 'color 0.3s ease',
                  ...(isComplete && {
                    animation: `${checkBounce} 0.4s ease-out`,
                    textShadow: '0 0 8px rgba(34, 197, 94, 0.5)'
                  })
                }}>
                  {isComplete ? '✓ 100%' : `${percent}%`}
                </Typography>
              )}
            </Box>
            {total > 0 && (
              <Box sx={{
                height: isComplete ? 4 : 3,
                bgcolor: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
                transition: 'height 0.3s ease',
                ...(isComplete && {
                  animation: `${pulseGlow} 1.5s ease-in-out 3`
                })
              }}>
                <Box sx={{
                  height: '100%',
                  width: `${percent}%`,
                  background: barGradient,
                  borderRadius: 2,
                  transition: 'width 0.5s ease, background 0.3s ease',
                  ...(percent >= 75 && !isComplete && {
                    boxShadow: '0 0 6px rgba(251, 191, 36, 0.5)'
                  })
                }} />
              </Box>
            )}
          </Box>
        );
      })()}
    </Box>
  );
});

ListHeader.displayName = 'ListHeader';
