import { useNavigate } from 'react-router-dom';
import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Card, Tabs, Tab,
  Chip, Avatar, Badge, InputAdornment, Alert, CircularProgress, Menu, MenuItem, Divider
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import type { List, Product, User } from '../../../global/types';
import type { LocalNotification } from '../../../global/hooks';
import type { PersistedNotification } from '../../../services/api';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic, LIST_ICONS, GROUP_ICONS, LIST_COLORS, MENU_OPTIONS, SIZES } from '../../../global/helpers';
import { Modal, ConfirmModal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { useHome } from '../hooks/useHome';
import { usePushNotifications } from '../../../global/hooks';

// ===== אנימציות =====
const checkmarkPopKeyframes = {
  '@keyframes checkmarkPop': {
    '0%': { transform: 'scale(0)', opacity: 0 },
    '50%': { transform: 'scale(1.3)' },
    '100%': { transform: 'scale(1)', opacity: 1 }
  }
};

const shakeKeyframes = {
  '@keyframes shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '25%, 75%': { transform: 'translateX(-2px)' },
    '50%': { transform: 'translateX(2px)' }
  }
};

const notificationDismissKeyframes = {
  '@keyframes notificationDismiss': {
    '0%': { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: 1 },
    '20%': { transform: 'translateY(20px) translateX(30px) rotate(5deg)', opacity: 0.9 },
    '100%': { transform: 'translateY(400px) translateX(100px) rotate(15deg)', opacity: 0 }
  }
};

const notificationSlideInKeyframes = {
  '@keyframes notificationSlideIn': {
    '0%': { opacity: 0, transform: 'translateY(10px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  }
};

// ===== סגנונות משותפים =====
const glassButtonSx = {
  bgcolor: 'rgba(255,255,255,0.2)',
  backdropFilter: 'blur(10px)',
  width: 40,
  height: 40
};

const iconSelectSx = (isSelected: boolean) => ({
  width: 44,
  height: 44,
  borderRadius: '10px',
  border: isSelected ? '2px solid' : '1.5px solid',
  borderColor: isSelected ? 'primary.main' : 'divider',
  bgcolor: isSelected ? 'rgba(20, 184, 166, 0.08)' : 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  cursor: 'pointer',
  transition: 'all 0.15s',
  '&:hover': { borderColor: 'primary.main' }
});

const colorSelectSx = (isSelected: boolean) => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  border: isSelected ? '3px solid' : '3px solid transparent',
  borderColor: isSelected ? 'text.primary' : 'transparent',
  cursor: 'pointer',
  transition: 'transform 0.15s',
  '&:hover': { transform: 'scale(1.1)' }
});

// ===== קומפוננטת כרטיס רשימה =====
interface ListCardProps {
  list: List;
  isMuted: boolean;
  isOwner: boolean;
  onSelect: (list: List) => void;
  onEditList: (list: List) => void;
  onDeleteList: (list: List) => void;
  onToggleMute: (listId: string) => void;
  t: (key: TranslationKeys) => string;
}

const ListCard = memo(({ list: l, isMuted, isOwner, onSelect, onEditList, onDeleteList, onToggleMute, t }: ListCardProps) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const mainNotificationsOff = !settings.notifications.enabled;
  const count = l.products.filter((p: Product) => !p.isPurchased).length;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  return (
    <Card sx={{ display: 'flex', alignItems: 'center', gap: 1.75, p: 2, mb: 1.5, cursor: 'pointer' }} onClick={() => onSelect(l)}>
      <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
        {l.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</Typography>
          <Chip label={l.isGroup ? t('group') : t('private')} size="small" sx={{ bgcolor: l.isGroup ? (isDark ? 'rgba(20,184,166,0.15)' : '#CCFBF1') : (isDark ? 'rgba(3,105,161,0.15)' : '#E0F2FE'), color: l.isGroup ? (isDark ? '#5EEAD4' : '#0D9488') : (isDark ? '#7DD3FC' : '#0369A1'), height: 22, flexShrink: 0 }} />
        </Box>
        <Typography sx={{ fontSize: 13, color: count > 0 ? 'warning.main' : 'success.main' }}>
          {count > 0 ? `${count} ${t('items')}` : `✓ ${t('completed')}`}
        </Typography>
      </Box>
      {/* אייקון מושתק + תפריט שלוש נקודות */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
        {isMuted && <NotificationsOffIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}
          sx={{ color: 'text.secondary', width: 32, height: 32 }}
        >
          <MoreVertIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={(e: React.SyntheticEvent) => { e.stopPropagation?.(); setAnchorEl(null); }}
          onClick={(e) => e.stopPropagation()}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '16px',
                minWidth: 240,
                mt: 1,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                py: 0.5,
                overflow: 'visible'
              }
            }
          }}
        >
          {/* Mute Toggle — only for groups */}
          {l.isGroup && (
            <Box sx={{ px: 1.5, py: 1 }}>
              <Box
                onClick={() => { if (!mainNotificationsOff) { setAnchorEl(null); onToggleMute(l.id); } }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.5,
                  borderRadius: '12px',
                  bgcolor: isMuted || mainNotificationsOff
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(20,184,166,0.08)',
                  border: '1px solid',
                  borderColor: isMuted || mainNotificationsOff
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(20,184,166,0.15)',
                  cursor: mainNotificationsOff ? 'default' : 'pointer',
                  opacity: mainNotificationsOff ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  '&:active': mainNotificationsOff ? {} : { transform: 'scale(0.97)' }
                }}
              >
                {isMuted || mainNotificationsOff
                  ? <VolumeOffIcon sx={{ color: mainNotificationsOff ? 'grey.400' : 'error.main', fontSize: 22 }} />
                  : <VolumeUpIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                }
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: isMuted ? 'error.main' : 'text.primary' }}>
                    {isMuted ? t('unmuteGroup') : t('muteGroup')}
                  </Typography>
                  {mainNotificationsOff && (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {t('notificationsOff')}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {l.isGroup && isOwner && <Divider />}

          {isOwner && (
            <MenuItem
              onClick={() => { setAnchorEl(null); onEditList(l); }}
              sx={{ py: 1.5, px: 2.5, gap: 1.5 }}
            >
              <EditIcon sx={{ color: 'primary.main', fontSize: 22 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                {l.isGroup ? t('editGroup') : t('editList')}
              </Typography>
            </MenuItem>
          )}

          {isOwner && (
            <MenuItem
              onClick={() => { setAnchorEl(null); onDeleteList(l); }}
              sx={{ py: 1.5, px: 2.5, gap: 1.5 }}
            >
              <DeleteOutlineIcon sx={{ color: 'error.main', fontSize: 22 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'error.main' }}>
                {l.isGroup ? t('deleteGroup') : t('deleteList')}
              </Typography>
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Card>
  );
});

ListCard.displayName = 'ListCard';

// ===== ממשק Props =====
interface HomePageProps {
  lists: List[];
  user: User;
  onSelectList: (list: List) => void;
  onCreateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onEditList: (list: List) => void;
  onJoinGroup: (code: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
  // התראות שמורות מה-API
  persistedNotifications?: PersistedNotification[];
  notificationsLoading?: boolean;
  onMarkPersistedNotificationRead?: (notificationId: string) => void;
  onClearAllPersistedNotifications?: (listId?: string) => void;
}

export const HomeComponent = memo(({
  lists, onSelectList, onCreateList, onDeleteList, onEditList, onJoinGroup, onLogout, user,
  persistedNotifications = [], notificationsLoading = false, onMarkPersistedNotificationRead, onClearAllPersistedNotifications
}: HomePageProps) => {
  const navigate = useNavigate();
  const { t, settings, isGroupMuted, toggleGroupMute } = useSettings();
  const isDark = settings.theme === 'dark';
  const { isSupported: pushSupported, isPwaInstalled, isSubscribed: pushSubscribed, permission: pushPermission, subscribe: subscribePush, loading: pushLoading } = usePushNotifications();

  // מצב הצעת התראות push
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushPromptError, setPushPromptError] = useState(false);
  const [pushPromptDismissed, setPushPromptDismissed] = useState(() => {
    return localStorage.getItem('pushPromptDismissed') === 'true';
  });

  // הצגת הצעת push לאחר השהיה
  useEffect(() => {
    if (pushSupported && isPwaInstalled && !pushSubscribed && !pushPromptDismissed && !pushLoading && pushPermission !== 'denied') {
      const timer = setTimeout(() => setShowPushPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [pushSupported, isPwaInstalled, pushSubscribed, pushPromptDismissed, pushLoading, pushPermission]);

  const handleEnablePush = async () => {
    setPushPromptError(false);
    const success = await subscribePush();
    if (success) {
      setShowPushPrompt(false);
    } else {
      // הצגת שגיאה בהצעה - סגירת הפרומפט וניווט להגדרות לפרטים
      handleDismissPushPrompt();
    }
  };

  const handleDismissPushPrompt = () => {
    setShowPushPrompt(false);
    setPushPromptDismissed(true);
    localStorage.setItem('pushPromptDismissed', 'true');
  };

  const {
    tab, search, showMenu, showCreate, showCreateGroup, showJoin,
    showNotifications, confirmLogout, editList, confirmDeleteList,
    newL, joinCode, joinPass, joinError, createError, joiningGroup, joinCooldown,
    userLists, my, groups, display,
    setTab, setSearch, setShowMenu, setShowNotifications, setConfirmLogout,
    setEditList, setConfirmDeleteList, setJoinCode, setJoinPass, setJoinError,
    handleCreate, handleJoin, openOption, closeCreateModal, closeCreateGroupModal,
    closeJoinModal, updateNewListField, updateEditListField, saveEditList,
    deleteList
  } = useHome({
    lists, user, onCreateList, onDeleteList, onEditList, onJoinGroup
  });

  // מעקב אחר התראות שנסגרות (לצורך אנימציה)
  const [dismissingNotifications, setDismissingNotifications] = useState<Set<string>>(new Set());

  // המרת התראות שמורות לפורמט תצוגה
  const allNotifications = useMemo(() => {
    return persistedNotifications
      .filter(n => !n.read)
      .map(n => ({
        id: n.id,
        type: (n.type === 'product_update' ? 'product_edit' : n.type) as LocalNotification['type'],
        listId: n.listId,
        listName: n.listName,
        userId: n.actorId,
        userName: n.actorName,
        timestamp: new Date(n.createdAt),
        read: n.read,
        isLocal: false,
        productName: n.productName,
        isPurchased: n.type === 'product_purchase' ? true : n.type === 'product_unpurchase' ? false : undefined
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [persistedNotifications]);

  // חישוב סה"כ לא נקראו
  const totalUnreadCount = allNotifications.length;

  const handleDismissNotification = useCallback((_listId: string, notificationId: string) => {
    // הוספה לסט נסגרות להפעלת אנימציה
    setDismissingNotifications(prev => new Set(prev).add(notificationId));

    // סימון כנקראה
    onMarkPersistedNotificationRead?.(notificationId);

    // ניקוי מסט נסגרות לאחר סיום אנימציה
    setTimeout(() => {
      setDismissingNotifications(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }, 600);
  }, [onMarkPersistedNotificationRead]);

  const handleMarkAllRead = useCallback(() => {
    onClearAllPersistedNotifications?.();
  }, [onClearAllPersistedNotifications]);

  // Ref לשדה סיסמה במודאל הצטרפות
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // פוקוס אוטומטי לשדה סיסמה כשהקוד מושלם
  useEffect(() => {
    if (joinCode.length === 6 && showJoin) {
      passwordInputRef.current?.focus();
    }
  }, [joinCode, showJoin]);

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ background: isDark ? 'linear-gradient(135deg, #0D9488, #047857)' : 'linear-gradient(135deg, #14B8A6, #10B981)', p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' }, borderRadius: '0 0 24px 24px', flexShrink: 0, boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(79, 70, 229, 0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              onClick={() => navigate('/profile')}
              sx={{ bgcolor: user.avatarColor || 'rgba(255,255,255,0.25)', cursor: 'pointer', width: 44, height: 44, fontSize: 18, border: '2px solid rgba(255,255,255,0.3)' }}
            >
              {user.avatarEmoji || user.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{t('hello')}</Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 700, color: 'white' }}>{user.name}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <IconButton onClick={() => setShowNotifications(true)} sx={glassButtonSx}>
              <Badge badgeContent={notificationsLoading ? 0 : totalUnreadCount} color="error" invisible={notificationsLoading} sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 700, minWidth: 16, height: 16 } }}>
                <NotificationsIcon sx={{ color: 'white', fontSize: 22 }} />
              </Badge>
            </IconButton>
            <IconButton onClick={() => navigate('/settings')} sx={glassButtonSx}>
              <SettingsIcon sx={{ color: 'white', fontSize: 22 }} />
            </IconButton>
          </Box>
        </Box>

        <TextField
          fullWidth
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: '12px' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9CA3AF' }} /></InputAdornment> }}
        />

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            borderRadius: { xs: '10px', sm: '12px' },
            p: { xs: 0.5, sm: 0.6 },
            minHeight: 'auto',
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              borderRadius: { xs: '8px', sm: '10px' },
              py: { xs: 1.25, sm: 1.5 },
              minHeight: 'auto',
              fontSize: { xs: 15, sm: 16 },
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              textTransform: 'none',
              '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main' }
            }
          }}
        >
          <Tab value="all" label={`${t('all')} (${userLists.length})`} />
          <Tab value="my" label={`${t('myLists')} (${my.length})`} />
          <Tab value="groups" label={`${t('groups')} (${groups.length})`} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, sm: 2.5 }, pb: { xs: 'calc(80px + env(safe-area-inset-bottom))', sm: 'calc(70px + env(safe-area-inset-bottom))' }, WebkitOverflowScrolling: 'touch' }}>
        {display.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: { xs: 4, sm: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <Box sx={{ width: { xs: 100, sm: 120 }, height: { xs: 100, sm: 120 }, borderRadius: { xs: '24px', sm: '30px' }, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 2.5, sm: 3 }, fontSize: { xs: 52, sm: 64 }, boxShadow: '0 4px 12px rgba(20, 184, 166, 0.1)' }}>
              {tab === 'groups' ? '👥' : '📝'}
            </Box>
            <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
              {tab === 'groups' ? t('noGroups') : t('noLists')}
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: 'text.secondary', mb: { xs: 3, sm: 4 }, maxWidth: { xs: 260, sm: 280 } }}>
              {tab === 'groups' ? t('noGroupsDesc') : t('noListsDesc')}
            </Typography>
            <Button
              variant="contained"
              onClick={() => { haptic('medium'); setShowMenu(true); }}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 2.5, sm: 3 }, py: { xs: 1.25, sm: 1.5 }, fontSize: { xs: 14, sm: 15 } }}
            >
              <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              <span>{tab === 'groups' ? t('createFirstGroup') : t('createFirstList')}</span>
            </Button>
          </Box>
        ) : (<>
          <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: 'text.secondary', mb: 1, px: 0.5 }}>
            📋 {display.length} {t('listsCount')}
          </Typography>
          {display.map((l: List) => (
          <ListCard
            key={l.id}
            list={l}
            isMuted={isGroupMuted(l.id)}
            isOwner={l.owner.id === user.id}
            onSelect={onSelectList}
            onEditList={(list) => setEditList({ ...list })}
            onDeleteList={(list) => setConfirmDeleteList(list)}
            onToggleMute={toggleGroupMute}
            t={t}
          />
        ))}
        </>)}
      </Box>

      {/* Menu Bottom Sheet */}
      {showMenu && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 998, backdropFilter: 'blur(4px)' }} onClick={() => setShowMenu(false)} />
          <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', borderRadius: '24px 24px 0 0', p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 999, maxWidth: { xs: '100%', sm: 400 }, mx: 'auto', boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }}>
            <Box sx={{ width: 36, height: 4, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mb: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary' }}>{t('whatToCreate')}</Typography>
              <IconButton onClick={() => setShowMenu(false)} sx={{ bgcolor: 'action.hover', width: 40, height: 40, '&:active': { transform: 'scale(0.95)' } }}>
                <CloseIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {MENU_OPTIONS.map((option) => (
                <Box
                  key={option.id}
                  onClick={() => openOption(option.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    gap: 1.5,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                    '&:active': { bgcolor: 'action.hover' }
                  }}
                >
                  <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: option.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {option.icon}
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'right' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{t(option.titleKey)}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t(option.descKey)}</Typography>
                  </Box>
                  <ChevronLeftIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Create Private List Modal */}
      {showCreate && (
        <Modal title={t('privateList')} onClose={closeCreateModal}>
          {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: SIZES.radius.md }}>{createError}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '14px', bgcolor: newL.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 4px 12px ${newL.color}40` }}>
              {newL.icon}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>{t('listName')}</Typography>
            <TextField fullWidth value={newL.name} onChange={e => updateNewListField('name', e.target.value)} size="small" />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('icon')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              {LIST_ICONS.map(i => (
                <Box key={i} onClick={() => updateNewListField('icon', i)} sx={iconSelectSx(newL.icon === i)}>{i}</Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => updateNewListField('color', c)} sx={{ ...colorSelectSx(newL.color === c), bgcolor: c }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={() => handleCreate(false)} sx={{ py: 1.25, fontSize: 15 }}>{t('createList')}</Button>
        </Modal>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <Modal title={t('newGroup')} onClose={closeCreateGroupModal}>
          {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: SIZES.radius.md }}>{createError}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '14px', bgcolor: newL.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 4px 12px ${newL.color}40` }}>
              {newL.icon}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>{t('groupName')}</Typography>
            <TextField fullWidth value={newL.name} onChange={e => updateNewListField('name', e.target.value)} size="small" />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('icon')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              {GROUP_ICONS.map(i => (
                <Box key={i} onClick={() => updateNewListField('icon', i)} sx={iconSelectSx(newL.icon === i)}>{i}</Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => updateNewListField('color', c)} sx={{ ...colorSelectSx(newL.color === c), bgcolor: c }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={() => handleCreate(true)} sx={{ py: 1.25, fontSize: 15 }}>{t('createGroup')}</Button>
        </Modal>
      )}

      {/* Join Group Modal */}
      {showJoin && (
        <Modal title={t('joinGroup')} onClose={() => !joiningGroup && closeJoinModal()}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 72,
              height: 72,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #14B8A6, #10B981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              mx: 'auto',
              mb: 2,
              boxShadow: '0 8px 24px rgba(20, 184, 166, 0.25)'
            }}>
              🔗
            </Box>
            <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.secondary', lineHeight: 1.5 }}>
              {t('enterCodeAndPasswordHint')}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{t('groupCode')}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('sixChars')}</Typography>
            </Box>
            <TextField
              fullWidth
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase().slice(0, 6)); setJoinError(''); }}
              placeholder="_ _ _ _ _ _"
              size="small"
              inputProps={{ maxLength: 6, dir: 'ltr', style: { textAlign: 'left', textTransform: 'uppercase', letterSpacing: 12, fontWeight: 700, fontSize: 20, paddingLeft: 16 } }}
              sx={{
                ...shakeKeyframes,
                animation: joinError ? 'shake 0.5s ease-in-out' : 'none',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: joinError ? 'rgba(239,68,68,0.1)' : 'action.hover',
                  transition: 'all 0.2s',
                  '& fieldset': { borderColor: joinError ? '#EF4444' : undefined },
                  '&.Mui-focused': { bgcolor: 'background.paper' },
                  '&.Mui-focused fieldset': { borderColor: joinError ? '#EF4444' : undefined }
                }
              }}
              InputProps={{
                startAdornment: joinError ? (
                  <InputAdornment position="start">
                    <Box
                      onClick={() => { setJoinCode(''); setJoinError(''); }}
                      sx={{ color: '#EF4444', fontSize: 18, fontWeight: 700, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                    >✕</Box>
                  </InputAdornment>
                ) : joinCode.length === 6 ? (
                  <InputAdornment position="start">
                    <Box sx={{
                      color: 'success.main',
                      fontSize: 18,
                      fontWeight: 700,
                      animation: 'checkmarkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      ...checkmarkPopKeyframes
                    }}>✓</Box>
                  </InputAdornment>
                ) : null
              }}
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{t('password')}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t('fourDigits')}</Typography>
            </Box>
            <TextField
              fullWidth
              value={joinPass}
              onChange={e => { setJoinPass(e.target.value.replace(/\D/g, '').slice(0, 4)); setJoinError(''); }}
              placeholder="_ _ _ _"
              size="small"
              inputRef={passwordInputRef}
              inputProps={{ maxLength: 4, inputMode: 'numeric', dir: 'ltr', style: { textAlign: 'left', letterSpacing: 16, fontWeight: 700, fontSize: 20, paddingLeft: 16 } }}
              sx={{
                ...shakeKeyframes,
                animation: joinError ? 'shake 0.5s ease-in-out' : 'none',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: joinError ? 'rgba(239,68,68,0.1)' : 'action.hover',
                  transition: 'all 0.2s',
                  '& fieldset': { borderColor: joinError ? '#EF4444' : undefined },
                  '&.Mui-focused': { bgcolor: 'background.paper' },
                  '&.Mui-focused fieldset': { borderColor: joinError ? '#EF4444' : undefined }
                }
              }}
              InputProps={{
                startAdornment: joinError ? (
                  <InputAdornment position="start">
                    <Box
                      onClick={() => { setJoinPass(''); setJoinError(''); }}
                      sx={{ color: '#EF4444', fontSize: 18, fontWeight: 700, cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
                    >✕</Box>
                  </InputAdornment>
                ) : joinPass.length === 4 ? (
                  <InputAdornment position="start">
                    <Box sx={{
                      color: 'success.main',
                      fontSize: 18,
                      fontWeight: 700,
                      animation: 'checkmarkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      ...checkmarkPopKeyframes
                    }}>✓</Box>
                  </InputAdornment>
                ) : null
              }}
            />
          </Box>

          {joinError && <Alert severity={joinCooldown > 0 ? 'warning' : 'error'} sx={{ mb: 2, borderRadius: '12px', fontSize: 13 }}>
            {joinCooldown > 0 ? `${joinError} (${joinCooldown}s)` : joinError}
          </Alert>}

          <Button
            variant="contained"
            fullWidth
            onClick={handleJoin}
            disabled={joinCode.length < 6 || joinPass.length < 4 || joiningGroup || joinCooldown > 0}
            sx={{
              py: 1.5,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              '&:disabled': { boxShadow: 'none' }
            }}
          >
            {joiningGroup ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              t('joinGroup')
            )}
          </Button>
        </Modal>
      )}

      {/* Edit List Modal */}
      {editList && (
        <Modal title={editList.isGroup ? t('editGroup') : t('editList')} onClose={() => setEditList(null)}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <Box sx={{ width: 60, height: 60, borderRadius: '14px', bgcolor: editList.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 4px 12px ${editList.color}40` }}>
              {editList.icon}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>{t('name')}</Typography>
            <TextField fullWidth value={editList.name} onChange={e => updateEditListField('name', e.target.value)} size="small" />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('icon')}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              {(editList.isGroup ? GROUP_ICONS : LIST_ICONS).map(i => (
                <Box key={i} onClick={() => updateEditListField('icon', i)} sx={iconSelectSx(editList.icon === i)}>{i}</Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('color')}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => updateEditListField('color', c)} sx={{ ...colorSelectSx(editList.color === c), bgcolor: c }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={saveEditList} sx={{ py: 1.25, fontSize: 15 }}>{t('saveChanges')}</Button>
          {!editList.isGroup && (
            <Button
              fullWidth
              onClick={() => {
                const converted = { ...editList, isGroup: true, password: '0000' };
                setEditList(null);
                onEditList(converted);
              }}
              sx={{ mt: 1.5, py: 1.25, borderRadius: '12px', bgcolor: 'rgba(20,184,166,0.1)', color: 'primary.main', fontSize: 14, fontWeight: 600, '&:hover': { bgcolor: 'rgba(20,184,166,0.15)' } }}
            >
              👥 {t('convertToGroup')}
            </Button>
          )}
          <Button fullWidth onClick={() => { setConfirmDeleteList(editList); setEditList(null); }} sx={{ mt: 1.5, py: 1.25, borderRadius: '12px', bgcolor: 'rgba(239,68,68,0.1)', color: 'error.main', fontSize: 14, fontWeight: 600, '&:hover': { bgcolor: 'rgba(239,68,68,0.15)' } }}>
            {editList.isGroup ? t('deleteGroup') : t('deleteList')}
          </Button>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmDeleteList && (
        <ConfirmModal
          title={confirmDeleteList.isGroup ? t('deleteGroupTitle') : t('deleteListTitle')}
          message={`${t('delete')} "${confirmDeleteList.name}"? ${t('deleteConfirmMessage')}`}
          confirmText={t('delete')}
          onConfirm={deleteList}
          onCancel={() => setConfirmDeleteList(null)}
        />
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <Modal title={t('notifications')} onClose={() => setShowNotifications(false)}>
          {allNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
              <Box sx={{
                width: 80,
                height: 80,
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(16,185,129,0.06))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                mx: 'auto',
                mb: 2.5,
              }}>
                🔔
              </Box>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
                {t('noNotifications')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {t('noNotificationsYet')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {/* Count sub-header */}
              <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: 'text.secondary', mb: 1.5, px: 0.5 }}>
                {allNotifications.length}{' '}
                {allNotifications.length === 1 ? t('newNotification') : t('newNotifications')}
              </Typography>

              {/* Notification list */}
              <Box sx={{
                maxHeight: '55vh',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                mx: -0.5,
                px: 0.5,
                pb: 1,
                maskImage: 'linear-gradient(to bottom, black 0%, black 94%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 94%, transparent 100%)',
              }}>
                {allNotifications.map((n, index) => {
                  const isDismissing = dismissingNotifications.has(n.id);
                  const notificationDate = n.timestamp ? new Date(n.timestamp) : null;

                  const getTimeDisplay = () => {
                    if (!notificationDate) return '';
                    const now = new Date();
                    const diffMs = now.getTime() - notificationDate.getTime();
                    const diffMin = Math.floor(diffMs / 60000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    const lang = settings.language;

                    const isToday = notificationDate.toDateString() === now.toDateString();
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const isYesterday = notificationDate.toDateString() === yesterday.toDateString();

                    if (diffMin < 1) return t('timeNow');
                    if (diffMin < 60 && isToday) return t('timeMinutesAgo').replace('{count}', String(diffMin));
                    if (isToday) {
                      const time = notificationDate.toLocaleTimeString(lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                      return t('timeHoursAgo').replace('{time}', time);
                    }
                    if (isYesterday) return t('timeYesterday');
                    if (diffDays < 7) return t('timeDaysAgo').replace('{count}', String(diffDays));
                    if (diffDays < 30) {
                      const weeks = Math.floor(diffDays / 7);
                      return t('timeWeeksAgo').replace('{count}', lang === 'he' ? (weeks === 1 ? 'שבוע' : `${weeks} שבועות`) : String(weeks));
                    }
                    const months = Math.floor(diffDays / 30);
                    return t('timeMonthsAgo').replace('{count}', lang === 'he' ? (months === 1 ? 'חודש' : `${months} חודשים`) : String(months));
                  };

                  const getEmoji = () => {
                    switch (n.type) {
                      case 'leave': return '👋';
                      case 'removed': case 'member_removed': return '🚫';
                      case 'list_deleted': return '🗑️';
                      case 'join': return '🎉';
                      case 'product_add': return '🛒';
                      case 'product_edit': return '✏️';
                      case 'product_delete': return '❌';
                      case 'product_purchase': return '✅';
                      case 'product_unpurchase': return '↩️';
                      case 'list_update': return '⚙️';
                      default: return '📢';
                    }
                  };

                  const getAccentColor = () => {
                    switch (n.type) {
                      case 'leave': case 'removed': case 'member_removed': case 'list_deleted': case 'product_delete': return '#EF4444';
                      case 'join': return '#10B981';
                      case 'product_add': return '#3B82F6';
                      case 'product_edit': return '#F59E0B';
                      case 'product_purchase': case 'product_unpurchase': return '#14B8A6';
                      case 'list_update': return '#8B5CF6';
                      default: return '#6B7280';
                    }
                  };

                  const getNotificationText = () => {
                    switch (n.type) {
                      case 'leave': return t('memberLeft');
                      case 'removed': return t('memberRemoved');
                      case 'member_removed': return t('removedYouNotif');
                      case 'list_deleted': return t('deletedGroupNotif');
                      case 'join': return t('memberJoined');
                      case 'product_add': return `${t('addedProductNotif')} "${n.productName}"`;
                      case 'product_edit': return `${t('editedProductNotif')} "${n.productName}"`;
                      case 'product_delete': return `${t('deletedProductNotif')} "${n.productName}"`;
                      case 'product_purchase': return `${t('purchasedNotif')} "${n.productName}"`;
                      case 'product_unpurchase': return `${t('unmarkedPurchasedNotif')} "${n.productName}"`;
                      case 'list_update': return t('listUpdatedNotif');
                      default: return '';
                    }
                  };

                  const accent = getAccentColor();

                  return (
                    <Box
                      key={n.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1.25,
                        px: 1.5,
                        mb: 0.75,
                        borderRadius: '12px',
                        bgcolor: 'action.hover',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        borderInlineStart: `3.5px solid ${accent}`,
                        transition: 'background-color 0.2s',
                        ...notificationSlideInKeyframes,
                        ...(isDismissing
                          ? { ...notificationDismissKeyframes, animation: 'notificationDismiss 0.5s ease-out forwards' }
                          : { animation: `notificationSlideIn 0.35s ease-out ${index * 0.05}s both` }
                        ),
                        '&:active': { bgcolor: 'rgba(0,0,0,0.04)' },
                        '&:last-child': { mb: 0 },
                      }}
                    >
                      {/* Icon */}
                      <Box sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '14px',
                        bgcolor: `${accent}14`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0,
                      }}>
                        {getEmoji()}
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{
                          fontSize: 13.5,
                          color: 'text.primary',
                          lineHeight: 1.45,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          <Box component="span" sx={{ fontWeight: 700 }}>{n.userName}</Box>
                          {' '}{getNotificationText()}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
                          <Typography sx={{
                            fontSize: 11.5,
                            color: 'text.secondary',
                            fontWeight: 500,
                            maxWidth: 140,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {n.listName}
                          </Typography>
                          <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', whiteSpace: 'nowrap' }}>
                            {getTimeDisplay()}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Dismiss */}
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleDismissNotification(n.listId, n.id); }}
                        disabled={isDismissing}
                        disableRipple
                        tabIndex={-1}
                        sx={{
                          color: 'text.disabled',
                          flexShrink: 0,
                          width: 36,
                          height: 36,
                          bgcolor: 'action.hover',
                          borderRadius: '50%',
                          opacity: isDismissing ? 0 : 0.5,
                          transition: 'opacity 0.2s',
                          '&:hover': { opacity: 0.7 },
                          border: 'none !important',
                          outline: 'none !important',
                          boxShadow: 'none !important',
                          '&:focus, &:focus-visible, &.Mui-focusVisible': { outline: 'none !important', boxShadow: 'none !important', border: 'none !important', bgcolor: 'action.hover' },
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>

              {/* Clear all button */}
              <Box sx={{ pt: 1.5, pb: 0.5 }}>
                <Button
                  fullWidth
                  onClick={handleMarkAllRead}
                  sx={{
                    borderRadius: '12px',
                    py: 1.2,
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'white',
                    background: 'linear-gradient(135deg, #14B8A6 0%, #10B981 100%)',
                    boxShadow: '0 2px 8px rgba(20, 184, 166, 0.3)',
                    textTransform: 'none',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                      boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)',
                    },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  {t('markAllAsRead')}
                </Button>
              </Box>
            </Box>
          )}
        </Modal>
      )}

      {/* Confirm Logout */}
      {confirmLogout && (
        <ConfirmModal title={t('logout')} message={t('logoutConfirm')} confirmText={t('logout')} onConfirm={() => { setConfirmLogout(false); onLogout(); }} onCancel={() => setConfirmLogout(false)} />
      )}

      {/* Push Notification Prompt */}
      {showPushPrompt && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={handleDismissPushPrompt} />
          <Box sx={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 360,
            bgcolor: 'background.paper',
            borderRadius: '20px',
            p: 3,
            zIndex: 1001,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '16px', background: pushPromptError ? 'linear-gradient(135deg, #F59E0B, #EAB308)' : 'linear-gradient(135deg, #14B8A6, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, mx: 'auto', mb: 2 }}>
              {pushPromptError ? '⚠️' : '🔔'}
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.primary', mb: 1 }}>
              {pushPromptError ? t('pushNotifBlocked') : t('enableNotifications')}
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 2.5, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {pushPromptError ? t('pushNotifBlockedDesc') : t('pushNotifBenefits')}
            </Typography>
            {!pushPromptError && (
              <Button
                variant="contained"
                fullWidth
                onClick={handleEnablePush}
                disabled={pushLoading}
                sx={{ py: 1.5, fontSize: 15, fontWeight: 600, borderRadius: '12px', mb: 1.5 }}
              >
                {pushLoading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  t('enableNotifications')
                )}
              </Button>
            )}
            <Button
              fullWidth
              onClick={handleDismissPushPrompt}
              sx={{ py: 1, fontSize: 14, color: 'text.secondary' }}
            >
              {pushPromptError ? t('gotIt') : t('notNow')}
            </Button>
          </Box>
        </>
      )}

      {/* Bottom Navigation */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: { xs: '100%', sm: 500, md: 600 },
          zIndex: 10,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          pb: 'env(safe-area-inset-bottom)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          py: { xs: 1, sm: 1.25 },
          px: { xs: 3, sm: 4 },
          boxShadow: isDark ? '0 -2px 10px rgba(0,0,0,0.3)' : '0 -2px 10px rgba(0,0,0,0.05)'
        }}
      >
        <Box
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
            py: 0.75,
            px: 2,
            borderRadius: '10px',
            bgcolor: 'rgba(20, 184, 166, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <HomeIcon sx={{ fontSize: 22, color: 'primary.main' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'primary.main' }}>{t('home')}</Typography>
        </Box>
        <Box
          onClick={() => { haptic('light'); setShowMenu(true); }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
            py: 0.75,
            px: 2,
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
            '&:active': { bgcolor: 'rgba(20, 184, 166, 0.1)' }
          }}
        >
          <AddIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 500, color: 'text.secondary' }}>{t('new')}</Typography>
        </Box>
      </Box>
    </Box>
  );
});

HomeComponent.displayName = 'HomeComponent';
