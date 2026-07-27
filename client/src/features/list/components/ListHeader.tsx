import { memo, useState, useCallback, useRef } from 'react';
import { Box, Typography, TextField, IconButton, Tabs, Tab, InputAdornment, Collapse, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShareIcon from '@mui/icons-material/Share';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import CloseIcon from '@mui/icons-material/Close';
import type { List, User } from '../../../global/types';
import { COMMON_STYLES } from '../../../global/helpers';
import { MembersButton, ListMenu } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ListFilter } from '../types/list-types';
import { QuickAddBar } from './header/QuickAddBar';
import { ListProgressBar } from './header/ListProgressBar';

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
  refreshing?: boolean;
  onClearList?: () => void;
  onResetList?: () => void;
  onShoppingMode?: () => void;
  hasPurchased?: boolean;
  hasProducts?: boolean;
  onLeave?: () => void;
  onScanList?: () => void;
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
  onShoppingMode,
  hasPurchased = false,
  hasProducts = false,
  onLeave,
  onScanList
}: ListHeaderProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [showSearch, setShowSearch] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
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

  return (
    <Box sx={{
      background: isDark ? 'linear-gradient(135deg, #0D9488, #047857)' : 'linear-gradient(135deg, #14B8A6, #0D9488)',
      p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 14px 14px', sm: '48px 20px 20px' },
      borderRadius: { xs: '0 0 20px 20px', sm: '0 0 24px 24px' },
      flexShrink: 0,
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(79, 70, 229, 0.15)',
      '@media (max-width: 360px)': {
        p: 'max(32px, env(safe-area-inset-top) + 6px) 10px 10px',
      },
      // ≤320px (Qin F21 Pro וקטן יותר) - דחיסה אגרסיבית גם ב-portrait
      '@media (max-width: 320px)': {
        p: 'max(24px, env(safe-area-inset-top) + 4px) 8px 8px',
        borderRadius: '0 0 14px 14px',
        '& .MuiOutlinedInput-root': { minHeight: '34px !important' },
        '& .MuiOutlinedInput-input': { fontSize: '13px !important', py: '4px !important' },
        '& .MuiTab-root': { minHeight: '28px !important', fontSize: '11.5px !important' },
        '& > .MuiBox-root': { marginBottom: '4px !important' },
      },
      // Landscape - דחיסה מקסימלית; שורת הכותרת מוסתרת, יש כפתור back מרחף
      '@media (orientation: landscape) and (max-height: 500px)': {
        position: 'relative',
        p: 'max(2px, env(safe-area-inset-top) + 2px) 40px 4px',
        borderRadius: '0 0 8px 8px',
        // mb בין שורות זעיר
        '& > * + *': { marginTop: '2px !important' },
        '& > .MuiBox-root': { marginBottom: '2px !important' },
        // אינפוטים: גובה 28
        '& .MuiOutlinedInput-root': { minHeight: '28px !important', height: '28px !important' },
        '& .MuiOutlinedInput-input': { fontSize: '13px !important', py: '2px !important' },
        // טאבים: ויזואלית 24 + tap-target מורחב דרך pseudo-element
        '& .MuiTab-root': {
          minHeight: '24px !important', py: '0px !important', fontSize: '11.5px !important',
          position: 'relative',
          '&::before': { content: '""', position: 'absolute', inset: '-6px 0' },
        },
        // glassButton ויזואלית 26 + tap-target 42x42 (a11y)
        '& [class*="MuiIconButton-root"]': {
          width: '26px !important', height: '26px !important',
          position: 'relative',
          '&::before': { content: '""', position: 'absolute', inset: '-8px' },
        },
        '& [class*="MuiIconButton-root"] .MuiSvgIcon-root': { fontSize: '15px !important' },
        // כותרת זעירה
        '& h6, & .MuiTypography-h6': { fontSize: '13px !important' },
      },
    }}>
      {/* כפתור back מרחף - מוצג רק ב-landscape כי שורת הכותרת מוסתרת.
          לחיצה חוזרת לעמוד הבית, תפקיד אקוויוולנטי לכפתור החזרה הרגיל. */}
      <IconButton
        onClick={onBack}
        aria-label={t('back')}
        sx={{
          display: 'none',
          '@media (orientation: landscape) and (max-height: 500px)': {
            display: 'flex',
            position: 'absolute',
            top: 4,
            insetInlineStart: 8,
            zIndex: 2,
            width: 28,
            height: 28,
            bgcolor: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
          },
        }}
      >
        <ArrowForwardIcon sx={{ fontSize: 16 }} />
      </IconButton>

      {/* Title Row - מוסתר ב-landscape, נשאר רק Quick Add + טאבים */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: { xs: 1, sm: 2 },
        '@media (max-width: 360px)': { mb: 0.5 },
        '@media (orientation: landscape) and (max-height: 500px)': { display: 'none' },
      }}>
        <IconButton
          onClick={onBack}
          sx={glassButtonSx}
          aria-label={t('back')}
        >
          <ArrowForwardIcon sx={{ color: 'white', fontSize: 22 }} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography sx={{
            color: 'white', fontSize: { xs: 18, sm: 20 }, fontWeight: 700, textAlign: 'center',
            '@media (max-width: 360px)': { fontSize: 15 },
            // שם ארוך - שתי שורות מקסימום עם ellipsis במקום חיתוך לשורה אחת
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', lineHeight: 1.2,
          }}>
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
        onShoppingMode={onShoppingMode}
        hasPurchased={hasPurchased}
        hasProducts={hasProducts}
        onLeave={onLeave}
        onScanList={onScanList}
      />

      {/* Members Row (Group Only) - מוסתר ב-landscape כדי לצמצם גובה הדר */}
      {list.isGroup && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          mb: { xs: 1, sm: 1.5 },
          '@media (max-width: 360px)': { mb: 0.5, gap: 0.5 },
          '@media (orientation: landscape) and (max-height: 500px)': { display: 'none' },
        }}>
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

      {/* Search Button Row (Private Lists Only) - מוסתר ב-landscape */}
      {!list.isGroup && (
        <Box sx={{
          display: 'flex', justifyContent: 'flex-end',
          mb: { xs: 1, sm: 1.5 },
          '@media (max-width: 360px)': { mb: 0.5 },
          '@media (orientation: landscape) and (max-height: 500px)': { display: 'none' },
        }}>
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
      <QuickAddBar list={list} onQuickAdd={onQuickAdd} />

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
            py: { xs: 1, sm: 1.75 },
            px: { xs: 1.25, sm: 2.5 },
            minHeight: { xs: 42, sm: 54 },
            fontSize: { xs: 14, sm: 16 },
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'none',
            '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main' }
          },
          '@media (max-width: 360px)': {
            p: 0.4,
            '& .MuiTab-root': {
              py: 0.5,
              px: 0.75,
              minHeight: 32,
              fontSize: 11,
            },
          },
        }}
      >
        <Tab value="pending" label={`${t('toBuy')} (${pendingCount})`} />
        <Tab value="purchased" label={`${t('purchased')} (${purchasedCount})`} />
      </Tabs>

      <ListProgressBar updatedAt={list.updatedAt} pendingCount={pendingCount} purchasedCount={purchasedCount} />
    </Box>
  );
});

ListHeader.displayName = 'ListHeader';
