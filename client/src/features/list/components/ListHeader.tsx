import { memo, useState, useCallback, useRef } from 'react';
import { Box, Typography, TextField, IconButton, Tabs, Tab, InputAdornment, Collapse } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import CloseIcon from '@mui/icons-material/Close';
import type { List, User } from '../../../global/types';
import { COMMON_STYLES, haptic } from '../../../global/helpers';
import { MembersButton, ListMenu } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ListFilter } from '../types/list-types';

// ===== סגנונות =====
const glassButtonSx = COMMON_STYLES.glassIconButton;

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
  onRefresh
}: ListHeaderProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [quickAddValue, setQuickAddValue] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleToggleSearch = useCallback(() => {
    if (showSearch) {
      setShowSearch(false);
      onSearchChange('');
    } else {
      setShowSearch(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch, onSearchChange]);

  // סגירת מקלדת אחרי הוספה
  const handleQuickAddButton = useCallback(() => {
    const trimmed = quickAddValue.trim();
    if (trimmed.length < 2 || !onQuickAdd) return;

    haptic('light');
    onQuickAdd(trimmed);
    setQuickAddValue('');

    // הסתרת מקלדת במובייל
    inputRef.current?.blur();
  }, [quickAddValue, onQuickAdd]);

  // Enter - שמירת מקלדת פתוחה להוספה רציפה
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = quickAddValue.trim();
      if (trimmed.length < 2 || !onQuickAdd) return;

      haptic('light');
      onQuickAdd(trimmed);
      setQuickAddValue('');
      // לא לסגור מקלדת - ממשיכים להוסיף
    }
  }, [quickAddValue, onQuickAdd]);

  return (
    <Box sx={{
      background: isDark ? 'linear-gradient(135deg, #0D9488, #047857)' : 'linear-gradient(135deg, #14B8A6, #0D9488)',
      p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' },
      borderRadius: '0 0 24px 24px',
      flexShrink: 0,
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(79, 70, 229, 0.15)'
    }}>
      {/* Title Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2 } }}>
        <IconButton
          onClick={onBack}
          sx={glassButtonSx}
          aria-label={t('back')}
        >
          <ArrowForwardIcon sx={{ color: 'white', fontSize: 22 }} />
        </IconButton>
        <Typography sx={{ flex: 1, color: 'white', fontSize: { xs: 18, sm: 20 }, fontWeight: 700, textAlign: 'center' }}>
          {list.name}
        </Typography>
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
      />

      {/* Members Row (Group Only) */}
      {list.isGroup && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
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
                fontSize: 15,
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
      <Box sx={{ mb: 1.5 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder={t('quickAddPlaceholder')}
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
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
              height: 52,
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
            endAdornment: (
              <InputAdornment position="end">
                {/* Add button - always visible, disabled when < 2 chars */}
                <IconButton
                  onClick={handleQuickAddButton}
                  disabled={quickAddValue.trim().length < 2}
                  sx={{
                    background: quickAddValue.trim().length >= 2
                      ? 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)'
                      : 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)',
                    color: 'white',
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    boxShadow: quickAddValue.trim().length >= 2
                      ? '0 2px 6px rgba(20, 184, 166, 0.35)'
                      : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: quickAddValue.trim().length >= 2
                        ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)'
                        : 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)',
                      boxShadow: quickAddValue.trim().length >= 2
                        ? '0 3px 10px rgba(20, 184, 166, 0.45)'
                        : 'none'
                    },
                    '&:active': {
                      transform: quickAddValue.trim().length >= 2 ? 'scale(0.92)' : 'none',
                      boxShadow: quickAddValue.trim().length >= 2
                        ? '0 1px 3px rgba(20, 184, 166, 0.3)'
                        : 'none'
                    },
                    '&.Mui-disabled': {
                      color: 'white',
                      opacity: 0.7
                    }
                  }}
                  aria-label={t('add')}
                >
                  <AddIcon sx={{ fontSize: 22 }} />
                </IconButton>
              </InputAdornment>
            ),
            'aria-label': t('quickAddPlaceholder')
          }}
        />
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
            py: 1.5,
            px: 2,
            minHeight: 48,
            fontSize: 15,
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
    </Box>
  );
});

ListHeader.displayName = 'ListHeader';
