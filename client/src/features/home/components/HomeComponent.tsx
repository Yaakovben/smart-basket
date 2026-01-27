import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, IconButton, Card, Tabs, Tab,
  Chip, Avatar, Badge, InputAdornment, Alert
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import AddIcon from '@mui/icons-material/Add';
import type { List, Product, User } from '../../../global/types';
import { haptic, LIST_ICONS, GROUP_ICONS, LIST_COLORS, MENU_OPTIONS, SIZES } from '../../../global/helpers';
import { Modal, ConfirmModal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { useHome } from '../hooks/useHome';
import type { ExtendedNotification } from '../types/home-types';

// ===== Animations =====
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

// ===== Reusable Styles =====
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

// ===== Props Interface =====
interface HomePageProps {
  lists: List[];
  user: User;
  onSelectList: (list: List) => void;
  onCreateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onEditList: (list: List) => void;
  onJoinGroup: (code: string, password: string) => { success: boolean; error?: string };
  onLogout: () => void;
  onMarkNotificationsRead: (listId: string) => void;
  onMarkSingleNotificationRead: (listId: string, notificationId: string) => void;
}

export const HomeComponent = ({ lists, onSelectList, onCreateList, onDeleteList, onEditList, onJoinGroup, onLogout, onMarkNotificationsRead, onMarkSingleNotificationRead, user }: HomePageProps) => {
  const navigate = useNavigate();
  const { t } = useSettings();

  const {
    // State
    tab, search, showMenu, showCreate, showCreateGroup, showJoin,
    showNotifications, confirmLogout, editList, confirmDeleteList,
    newL, joinCode, joinPass, joinError, createError,
    // Computed
    userLists, my, groups, myNotifications, unreadCount, display,
    // Setters
    setTab, setSearch, setShowMenu, setShowNotifications, setConfirmLogout,
    setEditList, setConfirmDeleteList, setJoinCode, setJoinPass, setJoinError,
    // Handlers
    handleCreate, handleJoin, openOption, closeCreateModal, closeCreateGroupModal,
    closeJoinModal, updateNewListField, updateEditListField, saveEditList,
    deleteList, markAllNotificationsRead, markNotificationRead
  } = useHome({
    lists, user, onCreateList, onDeleteList, onEditList, onJoinGroup, onMarkNotificationsRead, onMarkSingleNotificationRead
  });

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #14B8A6, #10B981)', p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' }, borderRadius: '0 0 24px 24px', flexShrink: 0, boxShadow: '0 4px 16px rgba(79, 70, 229, 0.15)' }}>
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
              <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 700, minWidth: 16, height: 16 } }}>
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
            <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: '#9CA3AF', mb: { xs: 3, sm: 4 }, maxWidth: { xs: 260, sm: 280 } }}>
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
        ) : display.map((l: List) => {
          const count = l.products.filter((p: Product) => !p.isPurchased).length;
          const isOwner = l.owner.id === user.id;
          return (
            <Card key={l.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.75, p: 2, mb: 1.5, cursor: 'pointer' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, flex: 1 }} onClick={() => onSelectList(l)}>
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {l.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{l.name}</Typography>
                    <Chip label={l.isGroup ? t('group') : t('private')} size="small" sx={{ bgcolor: l.isGroup ? '#CCFBF1' : '#E0F2FE', color: l.isGroup ? '#0D9488' : '#0369A1', height: 22 }} />
                  </Box>
                  <Typography sx={{ fontSize: 13, color: count > 0 ? 'warning.main' : 'success.main' }}>
                    {count > 0 ? `${count} ${t('items')}` : `✓ ${t('completed')}`}
                  </Typography>
                </Box>
              </Box>
              {isOwner && (
                <IconButton onClick={(e) => { e.stopPropagation(); setEditList(l); }} sx={{ bgcolor: 'action.hover', width: SIZES.iconButton.sm.width, height: SIZES.iconButton.sm.height }}>
                  <EditIcon sx={{ fontSize: SIZES.icon.sm, color: 'text.secondary' }} />
                </IconButton>
              )}
            </Card>
          );
        })}
      </Box>

      {/* Menu Bottom Sheet */}
      {showMenu && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 998, backdropFilter: 'blur(4px)' }} onClick={() => setShowMenu(false)} />
          <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', borderRadius: '24px 24px 0 0', p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 999, maxWidth: { xs: '100%', sm: 400 }, mx: 'auto', boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }}>
            <Box sx={{ width: 36, height: 4, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mb: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary' }}>{t('whatToCreate')}</Typography>
              <IconButton size="small" onClick={() => setShowMenu(false)} sx={{ bgcolor: 'action.hover', width: 32, height: 32 }}>
                <CloseIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
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
        <Modal title={t('joinGroup')} onClose={closeJoinModal}>
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
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>6 תווים</Typography>
            </Box>
            <TextField
              fullWidth
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase().slice(0, 6)); setJoinError(''); }}
              placeholder="_ _ _ _ _ _"
              size="small"
              inputProps={{ maxLength: 6, style: { textAlign: 'center', textTransform: 'uppercase', letterSpacing: 8, fontWeight: 700, fontSize: 20 } }}
              sx={{
                ...shakeKeyframes,
                animation: joinError ? 'shake 0.5s ease-in-out' : 'none',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: joinError ? '#FEE2E2' : 'action.hover',
                  transition: 'all 0.2s',
                  '& fieldset': { borderColor: joinError ? '#EF4444' : undefined },
                  '&.Mui-focused': { bgcolor: 'background.paper' },
                  '&.Mui-focused fieldset': { borderColor: joinError ? '#EF4444' : undefined }
                }
              }}
              InputProps={{
                endAdornment: joinError ? (
                  <Box sx={{ color: '#EF4444', fontSize: 20, fontWeight: 700 }}>✕</Box>
                ) : joinCode.length === 6 ? (
                  <Box sx={{
                    color: 'success.main',
                    fontSize: 20,
                    fontWeight: 700,
                    animation: 'checkmarkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    ...checkmarkPopKeyframes
                  }}>✓</Box>
                ) : null
              }}
            />
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{t('password')}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>4 ספרות</Typography>
            </Box>
            <TextField
              fullWidth
              value={joinPass}
              onChange={e => { setJoinPass(e.target.value.replace(/\D/g, '').slice(0, 4)); setJoinError(''); }}
              placeholder="_ _ _ _"
              size="small"
              inputProps={{ maxLength: 4, inputMode: 'numeric', style: { textAlign: 'center', letterSpacing: 12, fontWeight: 700, fontSize: 20 } }}
              sx={{
                ...shakeKeyframes,
                animation: joinError ? 'shake 0.5s ease-in-out' : 'none',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: joinError ? '#FEE2E2' : 'action.hover',
                  transition: 'all 0.2s',
                  '& fieldset': { borderColor: joinError ? '#EF4444' : undefined },
                  '&.Mui-focused': { bgcolor: 'background.paper' },
                  '&.Mui-focused fieldset': { borderColor: joinError ? '#EF4444' : undefined }
                }
              }}
              InputProps={{
                endAdornment: joinError ? (
                  <Box sx={{ color: '#EF4444', fontSize: 20, fontWeight: 700 }}>✕</Box>
                ) : joinPass.length === 4 ? (
                  <Box sx={{
                    color: 'success.main',
                    fontSize: 20,
                    fontWeight: 700,
                    animation: 'checkmarkPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    ...checkmarkPopKeyframes
                  }}>✓</Box>
                ) : null
              }}
            />
          </Box>

          {joinError && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', fontSize: 13 }}>{joinError}</Alert>}

          <Button
            variant="contained"
            fullWidth
            onClick={handleJoin}
            disabled={joinCode.length < 6 || joinPass.length < 4}
            sx={{
              py: 1.5,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
              '&:disabled': { boxShadow: 'none' }
            }}
          >
            {t('joinGroup')}
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
          <Button fullWidth onClick={() => { setConfirmDeleteList(editList); setEditList(null); }} sx={{ mt: 1.5, py: 1.25, borderRadius: '12px', bgcolor: '#FEE2E2', color: '#DC2626', fontSize: 14, fontWeight: 600, '&:hover': { bgcolor: '#FECACA' } }}>
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
          {myNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2.5 }}>
              <Typography sx={{ fontSize: 48 }}>🔔</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 15, mt: 1.5 }}>{t('noNotifications')}</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {myNotifications.map((n: ExtendedNotification) => {
                const isLeave = n.type === 'leave';
                return (
                  <Box key={n.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, bgcolor: isLeave ? '#FEF2F2' : '#F0FDF4', borderRadius: '12px', border: `1px solid ${isLeave ? '#FECACA' : '#BBF7D0'}` }}>
                    <Avatar sx={{ bgcolor: isLeave ? 'error.main' : 'success.main', width: 40, height: 40 }}>
                      {isLeave ? '👋' : '🎉'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: isLeave ? '#991B1B' : '#166534' }}>
                        {n.userName} {isLeave ? t('memberLeft') : t('memberJoined')}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: isLeave ? '#B91C1C' : '#15803D' }}>{n.listName}</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => markNotificationRead(n.listId, n.id)}
                      sx={{ color: isLeave ? '#991B1B' : '#166534' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
              <Button variant="contained" fullWidth sx={{ mt: 1 }} onClick={markAllNotificationsRead}>
                {t('markAllAsRead')}
              </Button>
            </Box>
          )}
        </Modal>
      )}

      {/* Confirm Logout */}
      {confirmLogout && (
        <ConfirmModal title="התנתקות" message="להתנתק?" confirmText="התנתק" onConfirm={() => { setConfirmLogout(false); onLogout(); }} onCancel={() => setConfirmLogout(false)} />
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
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
        }}
      >
        <Box
          onClick={() => {}}
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
};
