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

const glassButtonSx = COMMON_STYLES.glassIconButton;

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
  onShoppingMode?: () => void;
  hasProducts?: boolean;
  onLeave?: () => void;
  onScanList?: () => void;
}

export const ListHeader = memo(({
  list, user, filter, search, pendingCount, purchasedCount, allMembers,
  isOwner, onBack, onFilterChange, onSearchChange, onEditList, onDeleteList,
  onToggleMute, isMuted, mainNotificationsOff, onShareList, onShowMembers,
  onShowInvite, onQuickAdd, onlineUserIds, onRefresh, refreshing = false,
  onClearList, onShoppingMode, hasProducts = false, onLeave, onScanList,
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

  const searchButton = (
    <IconButton
      onClick={handleToggleSearch}
      sx={{
        ...glassButtonSx,
        bgcolor: showSearch ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
      aria-label={showSearch ? t('close') : t('search')}
    >
      {showSearch
        ? <SearchOffIcon sx={{ color: 'white', fontSize: 20 }} />
        : <SearchIcon sx={{ color: 'white', fontSize: 20 }} />}
    </IconButton>
  );

  return (
    <Box sx={{
      background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
      p: { xs: 'max(40px, env(safe-area-inset-top) + 8px) 14px 10px', sm: '44px 20px 16px' },
      borderRadius: { xs: '0 0 20px 20px', sm: '0 0 24px 24px' },
      flexShrink: 0,
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(13,148,136,0.15)',
      '@media (max-width: 360px)': {
        p: 'max(30px, env(safe-area-inset-top) + 6px) 10px 8px',
      },
      '@media (max-width: 320px)': {
        p: 'max(22px, env(safe-area-inset-top) + 4px) 8px 6px',
        borderRadius: '0 0 14px 14px',
        '& .MuiOutlinedInput-root': { minHeight: '34px !important' },
        '& .MuiOutlinedInput-input': { fontSize: '13px !important', py: '4px !important' },
        '& .MuiTab-root': { minHeight: '28px !important', fontSize: '11.5px !important' },
        '& > .MuiBox-root': { marginBottom: '4px !important' },
      },
      '@media (orientation: landscape) and (max-height: 500px)': {
        position: 'relative',
        p: 'max(2px, env(safe-area-inset-top) + 2px) 40px 4px',
        borderRadius: '0 0 8px 8px',
        '& > * + *': { marginTop: '2px !important' },
        '& > .MuiBox-root': { marginBottom: '2px !important' },
        '& .MuiOutlinedInput-root': { minHeight: '28px !important', height: '28px !important' },
        '& .MuiOutlinedInput-input': { fontSize: '13px !important', py: '2px !important' },
        '& .MuiTab-root': {
          minHeight: '24px !important', py: '0px !important', fontSize: '11.5px !important',
        },
        '& [class*="MuiIconButton-root"]': { width: '26px !important', height: '26px !important' },
        '& [class*="MuiIconButton-root"] .MuiSvgIcon-root': { fontSize: '15px !important' },
      },
    }}>
      {/* כפתור back מרחף - מוצג רק ב-landscape */}
      <IconButton onClick={onBack} aria-label={t('back')} sx={{
        display: 'none',
        '@media (orientation: landscape) and (max-height: 500px)': {
          display: 'flex', position: 'absolute', top: 4, insetInlineStart: 8, zIndex: 2,
          width: 28, height: 28, bgcolor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
          color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
        },
      }}>
        <ArrowForwardIcon sx={{ fontSize: 16 }} />
      </IconButton>

      {/* ===== שורה 1: חזרה + כותרת + שיתוף + תפריט ===== */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: { xs: 0.75, sm: 1.5 },
        '@media (max-width: 360px)': { mb: 0.5 },
        '@media (orientation: landscape) and (max-height: 500px)': { display: 'none' },
      }}>
        <IconButton onClick={onBack} sx={glassButtonSx} aria-label={t('back')}>
          <ArrowForwardIcon sx={{ color: 'white', fontSize: 22 }} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography sx={{
            color: 'white', fontSize: { xs: 17, sm: 19 }, fontWeight: 700, textAlign: 'center',
            '@media (max-width: 360px)': { fontSize: 14 },
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word', lineHeight: 1.2,
          }}>
            {list.name}
          </Typography>
          {refreshing && <CircularProgress size={16} sx={{ color: 'white' }} />}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={onShareList} sx={glassButtonSx} aria-label={t('shareList')}>
            <ShareIcon sx={{ color: 'white', fontSize: 20 }} />
          </IconButton>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} sx={glassButtonSx} aria-label={t('groupSettings')}>
            <MoreVertIcon sx={{ color: 'white', fontSize: 20 }} />
          </IconButton>
          {/* ברשימה פרטית - כפתור חיפוש אחרון בשורה (אין שורת Members).
              חייב להיות אחרון ב-DOM, לא ראשון: באפליקציית RTL האלמנט
              האחרון הוא זה שנופל בקצה החיצוני של השורה - בדיוק כמו בשורת
              הקבוצה, שבה searchButton גם הוא האחרון (אחרי ה-spacer). אם
              הוא היה ראשון כאן, הוא היה נופל באמצע ליד שיתוף/תפריט במקום
              בקצה, ונראה במיקום שונה מהקבוצה למרות שזו אותה כוונה. */}
          {!list.isGroup && searchButton}
        </Box>
      </Box>

      <ListMenu
        anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
        isGroup={list.isGroup} isOwner={isOwner} isMuted={isMuted}
        mainNotificationsOff={mainNotificationsOff} onToggleMute={onToggleMute}
        onEdit={onEditList} onDelete={onDeleteList} onRefresh={onRefresh}
        onClearList={onClearList} onShoppingMode={onShoppingMode}
        hasProducts={hasProducts} onLeave={onLeave} onScanList={onScanList}
      />

      {/* ===== שורה 2 (קבוצות): משתתפים + הזמנה + חיפוש ===== */}
      {list.isGroup && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          mb: { xs: 0.75, sm: 1 },
          '@media (max-width: 360px)': { mb: 0.5, gap: 0.5 },
          '@media (orientation: landscape) and (max-height: 500px)': { display: 'none' },
        }}>
          <MembersButton members={allMembers} currentUserId={user.id} onClick={onShowMembers} onlineUserIds={onlineUserIds} />
          <IconButton onClick={onShowInvite} sx={glassButtonSx} aria-label={t('inviteFriends')}>
            <PersonAddIcon sx={{ color: 'white', fontSize: 20 }} />
          </IconButton>
          <Box sx={{ flex: 1 }} />
          {searchButton}
        </Box>
      )}

      {/* ===== שורת QuickAdd ===== */}
      <Box sx={{
        mb: { xs: 0.75, sm: 1 },
        '@media (max-width: 360px)': { mb: 0.5 },
        '@media (orientation: landscape) and (max-height: 500px)': { display: 'none' },
      }}>
        <QuickAddBar list={list} onQuickAdd={onQuickAdd} />
      </Box>

      {/* ===== שדה חיפוש (מתקפל) - מתחת ל-QuickAdd ===== */}
      <Collapse in={showSearch}>
        <Box sx={{ mb: 0.75 }}>
          <TextField
            inputRef={searchInputRef}
            fullWidth
            placeholder={t('searchProducts')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper', borderRadius: '14px', height: 44,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.1)' }
              },
              '& .MuiOutlinedInput-input': { fontSize: 16, color: 'text.primary' }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton onClick={() => onSearchChange('')} size="small" sx={{ color: 'text.secondary' }} aria-label={t('close')}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>
      </Collapse>

      {/* ===== טאבים ===== */}
      <Tabs
        value={filter}
        onChange={(_, v) => onFilterChange(v)}
        variant="fullWidth"
        aria-label={t('toBuy')}
        sx={{
          bgcolor: 'rgba(255,255,255,0.15)',
          borderRadius: '14px',
          p: 0.6,
          minHeight: 'auto',
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            borderRadius: '10px',
            py: { xs: 0.75, sm: 1.5 },
            px: { xs: 1, sm: 2 },
            minHeight: { xs: 38, sm: 48 },
            fontSize: { xs: 13.5, sm: 15 },
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'none',
            '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main' },
          },
          '@media (max-width: 360px)': {
            p: 0.4,
            '& .MuiTab-root': { py: 0.5, px: 0.75, minHeight: 32, fontSize: 11 },
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
