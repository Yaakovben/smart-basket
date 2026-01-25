import { useState } from 'react';
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
import type { List, Member, Notification, Product, User } from '../../../global/types';
import { haptic, LIST_ICONS, GROUP_ICONS, LIST_COLORS, MENU_OPTIONS } from '../../../global/helpers';
import { Modal, ConfirmModal } from '../../../global/components';

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
}

export const HomeComponent = ({ lists, onSelectList, onCreateList, onDeleteList, onEditList, onJoinGroup, onLogout, onMarkNotificationsRead, user }: HomePageProps) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editList, setEditList] = useState<List | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState<List | null>(null);
  const [newL, setNewL] = useState<{ name: string; icon: string; color: string }>({ name: '', icon: '📋', color: '#14B8A6' });
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');

  const userLists = lists.filter((l: List) => {
    if (l.isGroup) {
      return l.owner.id === user.id || l.members.some((m: Member) => m.id === user.id);
    }
    return l.owner.id === user.id;
  });

  const myNotifications = userLists
    .filter((l: List) => l.isGroup && l.owner.id === user.id && (l.notifications?.length ?? 0) > 0)
    .flatMap((l: List) => (l.notifications || []).filter((n: Notification) => !n.read).map((n: Notification) => ({ ...n, listName: l.name, listId: l.id })));
  const unreadCount = myNotifications.length;
  const my = userLists.filter((l: List) => !l.isGroup);
  const groups = userLists.filter((l: List) => l.isGroup);
  const display = (tab === 'all' ? userLists : tab === 'my' ? my : groups).filter((l: List) => l.name.includes(search));

  const handleCreate = (isGroup: boolean) => {
    setCreateError('');
    if (!newL.name.trim()) { setCreateError('נא להזין שם לרשימה'); return; }
    if (newL.name.length < 2) { setCreateError('השם חייב להכיל לפחות 2 תווים'); return; }
    onCreateList({
      id: `l${Date.now()}`,
      ...newL,
      isGroup,
      owner: user,
      members: [],
      products: [],
      inviteCode: isGroup ? Math.random().toString(36).substring(2, 8).toUpperCase() : null,
      password: isGroup ? String(Math.floor(1000 + Math.random() * 9000)) : null
    });
    setNewL({ name: '', icon: isGroup ? '👨‍👩‍👧‍👦' : '🛒', color: '#14B8A6' });
    setShowCreate(false);
    setShowCreateGroup(false);
  };

  const handleJoin = () => {
    setJoinError('');
    if (!joinCode.trim() || !joinPass.trim()) { setJoinError('נא למלא קוד וסיסמה'); return; }
    const result = onJoinGroup(joinCode.trim().toUpperCase(), joinPass.trim());
    if (result.success) { setShowJoin(false); setJoinCode(''); setJoinPass(''); }
    else { setJoinError(result.error || 'שגיאה לא ידועה'); }
  };

  const openOption = (option: string) => {
    setShowMenu(false);
    if (option === 'private') setShowCreate(true);
    if (option === 'group') setShowCreateGroup(true);
    if (option === 'join') setShowJoin(true);
  };

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #14B8A6, #10B981)', p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' }, borderRadius: '0 0 24px 24px', flexShrink: 0, boxShadow: '0 4px 16px rgba(79, 70, 229, 0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 1.5 } }}>
            <Avatar
              onClick={() => navigate('/profile')}
              sx={{
                bgcolor: user.avatarColor || 'rgba(255,255,255,0.25)',
                cursor: 'pointer',
                width: { xs: 40, sm: 44 },
                height: { xs: 40, sm: 44 },
                fontSize: { xs: 16, sm: 18 }
              }}
            >
              {user.avatarEmoji || user.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: 'rgba(255,255,255,0.8)' }}>שלום,</Typography>
              <Typography sx={{ fontSize: { xs: 15, sm: 17 }, fontWeight: 700, color: 'white' }}>{user.name}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
            <IconButton
              onClick={() => setShowNotifications(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                width: { xs: 38, sm: 42 },
                height: { xs: 38, sm: 42 }
              }}
            >
              <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: { xs: 10, sm: 11 }, fontWeight: 700, minWidth: { xs: 16, sm: 18 }, height: { xs: 16, sm: 18 } } }}>
                <NotificationsIcon sx={{ color: 'white', fontSize: { xs: 20, sm: 24 } }} />
              </Badge>
            </IconButton>
            <IconButton
              onClick={() => navigate('/settings')}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                width: { xs: 38, sm: 42 },
                height: { xs: 38, sm: 42 }
              }}
            >
              <SettingsIcon sx={{ color: 'white', fontSize: { xs: 20, sm: 24 } }} />
            </IconButton>
          </Box>
        </Box>

        <TextField
          fullWidth
          placeholder="חפש..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '12px' } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9CA3AF' }} /></InputAdornment> }}
        />

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            borderRadius: { xs: '8px', sm: '10px' },
            p: { xs: 0.4, sm: 0.5 },
            minHeight: 'auto',
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              borderRadius: { xs: '6px', sm: '8px' },
              py: { xs: 1, sm: 1.25 },
              minHeight: 'auto',
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              textTransform: 'none',
              '&.Mui-selected': { bgcolor: 'white', color: 'primary.main' }
            }
          }}
        >
          <Tab value="all" label={`הכל (${userLists.length})`} />
          <Tab value="my" label={`שלי (${my.length})`} />
          <Tab value="groups" label={`קבוצות (${groups.length})`} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, sm: 2.5 }, pb: { xs: 'calc(100px + env(safe-area-inset-bottom))', sm: 'calc(90px + env(safe-area-inset-bottom))' }, WebkitOverflowScrolling: 'touch' }}>
        {display.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: { xs: 4, sm: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <Box sx={{ width: { xs: 100, sm: 120 }, height: { xs: 100, sm: 120 }, borderRadius: { xs: '24px', sm: '30px' }, background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: { xs: 2.5, sm: 3 }, fontSize: { xs: 52, sm: 64 }, boxShadow: '0 4px 12px rgba(20, 184, 166, 0.1)' }}>
              {tab === 'groups' ? '👥' : '📝'}
            </Box>
            <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
              {tab === 'groups' ? 'טרם נוצרו קבוצות' : 'טרם נוצרו רשימות'}
            </Typography>
            <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: '#9CA3AF', mb: { xs: 3, sm: 4 }, maxWidth: { xs: 260, sm: 280 } }}>
              {tab === 'groups' ? 'התחל בקבוצה משותפת וצור רשימות קניות עם המשפחה והחברים' : 'התחל ביצירת רשימת קניות חדשה ועקוב בקלות אחר הצרכים שלך'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => { haptic('medium'); setShowMenu(true); }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: { xs: 2.5, sm: 3 },
                py: { xs: 1.25, sm: 1.5 },
                fontSize: { xs: 14, sm: 15 }
              }}
            >
              <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
              <span>{tab === 'groups' ? 'צור קבוצה ראשונה' : 'צור רשימה ראשונה'}</span>
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
                    <Chip label={l.isGroup ? 'קבוצה' : 'פרטית'} size="small" sx={{ bgcolor: l.isGroup ? '#CCFBF1' : '#E0F2FE', color: l.isGroup ? '#0D9488' : '#0369A1', height: 22 }} />
                  </Box>
                  <Typography sx={{ fontSize: 13, color: count > 0 ? 'warning.main' : 'success.main' }}>
                    {count > 0 ? `${count} פריטים` : '✓ הושלם'}
                  </Typography>
                </Box>
              </Box>
              {isOwner && (
                <IconButton onClick={(e) => { e.stopPropagation(); setEditList(l); }} sx={{ bgcolor: '#F3F4F6', width: 36, height: 36 }}>
                  <EditIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                </IconButton>
              )}
            </Card>
          );
        })}
      </Box>

      {/* Menu Bottom Sheet */}
      {showMenu && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', zIndex: 998, backdropFilter: 'blur(2px)' }} onClick={() => setShowMenu(false)} />
          <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'white', borderRadius: '20px 20px 0 0', p: { xs: '12px 16px', sm: '12px 20px' }, pb: 'calc(28px + env(safe-area-inset-bottom))', zIndex: 999, maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
            <Box sx={{ width: 36, height: 4, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>מה תרצה ליצור?</Typography>
              <IconButton size="small" onClick={() => setShowMenu(false)} sx={{ bgcolor: '#F3F4F6' }}>
                <CloseIcon sx={{ fontSize: 16, color: '#9CA3AF' }} />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.75, sm: 1 } }}>
              {MENU_OPTIONS.map((option) => (
                <Button key={option.id} onClick={() => openOption(option.id)} fullWidth sx={{ justifyContent: 'flex-start', p: { xs: 1.25, sm: 1.5 }, borderRadius: { xs: '10px', sm: '12px' }, border: '1.5px solid #E5E7EB', textTransform: 'none', gap: { xs: 1.5, sm: 2 } }}>
                  <Box sx={{ width: { xs: 44, sm: 50 }, height: { xs: 44, sm: 50 }, borderRadius: { xs: '12px', sm: '14px' }, bgcolor: option.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: { xs: 22, sm: 26 }, flexShrink: 0 }}>
                    {option.icon}
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'right' }}>
                    <Typography sx={{ fontSize: { xs: 14, sm: 15 }, fontWeight: 600, color: '#1F2937' }}>{option.title}</Typography>
                    <Typography sx={{ fontSize: { xs: 11, sm: 12 }, color: '#9CA3AF' }}>{option.description}</Typography>
                  </Box>
                  <ChevronLeftIcon sx={{ color: '#D1D5DB', fontSize: { xs: 20, sm: 24 } }} />
                </Button>
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Create Private List Modal */}
      {showCreate && (
        <Modal title="רשימה פרטית חדשה" onClose={() => { setShowCreate(false); setNewL({ name: '', icon: '📋', color: '#14B8A6' }); setCreateError(''); }}>
          {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>⚠️ {createError}</Alert>}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>שם הרשימה</Typography>
            <TextField fullWidth value={newL.name} onChange={e => { setNewL({ ...newL, name: e.target.value }); setCreateError(''); }} placeholder="קניות שבועיות" />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>אייקון</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {LIST_ICONS.map(i => (
                <Button key={i} onClick={() => setNewL({ ...newL, icon: i })} sx={{ width: 48, height: 48, minWidth: 48, borderRadius: '12px', border: newL.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', bgcolor: newL.icon === i ? '#F0FDFA' : 'white', fontSize: 22 }}>
                  {i}
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>צבע</Typography>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => setNewL({ ...newL, color: c })} sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: c, border: newL.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={() => handleCreate(false)}>צור רשימה</Button>
        </Modal>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <Modal title="קבוצה חדשה" onClose={() => { setShowCreateGroup(false); setNewL({ name: '', icon: '👨‍👩‍👧‍👦', color: '#14B8A6' }); setCreateError(''); }}>
          {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>⚠️ {createError}</Alert>}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>שם הקבוצה</Typography>
            <TextField fullWidth value={newL.name} onChange={e => { setNewL({ ...newL, name: e.target.value }); setCreateError(''); }} placeholder="קניות משפחתיות" />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>אייקון</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {GROUP_ICONS.map(i => (
                <Button key={i} onClick={() => setNewL({ ...newL, icon: i })} sx={{ width: 48, height: 48, minWidth: 48, borderRadius: '12px', border: newL.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', bgcolor: newL.icon === i ? '#F0FDFA' : 'white', fontSize: 22 }}>
                  {i}
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>צבע</Typography>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => setNewL({ ...newL, color: c })} sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: c, border: newL.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={() => handleCreate(true)}>צור קבוצה</Button>
        </Modal>
      )}

      {/* Join Group Modal */}
      {showJoin && (
        <Modal title="הצטרף לקבוצה" onClose={() => { setShowJoin(false); setJoinError(''); setJoinCode(''); setJoinPass(''); }}>
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 14, mb: 2.5 }}>הזן את הקוד והסיסמה שקיבלת</Typography>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>קוד קבוצה</Typography>
            <TextField fullWidth value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="XXXXXX" inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase' } }} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>סיסמה</Typography>
            <TextField fullWidth value={joinPass} onChange={e => setJoinPass(e.target.value)} placeholder="••••" inputProps={{ maxLength: 4, style: { textAlign: 'center', fontSize: 18, letterSpacing: 2 } }} />
          </Box>
          {joinError && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{joinError}</Alert>}
          <Button variant="contained" fullWidth onClick={handleJoin}>הצטרף לקבוצה</Button>
        </Modal>
      )}

      {/* Edit List Modal */}
      {editList && (
        <Modal title={editList.isGroup ? 'עריכת קבוצה' : 'עריכת רשימה'} onClose={() => setEditList(null)}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>שם</Typography>
            <TextField fullWidth value={editList.name} onChange={e => setEditList({ ...editList, name: e.target.value })} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>אייקון</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(editList.isGroup ? GROUP_ICONS : LIST_ICONS).map(i => (
                <Button key={i} onClick={() => setEditList({ ...editList, icon: i })} sx={{ width: 48, height: 48, minWidth: 48, borderRadius: '12px', border: editList.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', bgcolor: editList.icon === i ? '#F0FDFA' : 'white', fontSize: 22 }}>
                  {i}
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>צבע</Typography>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => setEditList({ ...editList, color: c })} sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: c, border: editList.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={() => { onEditList(editList); setEditList(null); }}>שמור שינויים</Button>
          <Button fullWidth onClick={() => { setConfirmDeleteList(editList); setEditList(null); }} sx={{ mt: 1.5, bgcolor: '#FEE2E2', color: '#DC2626', '&:hover': { bgcolor: '#FECACA' } }}>
            מחק {editList.isGroup ? 'קבוצה' : 'רשימה'}
          </Button>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmDeleteList && (
        <ConfirmModal
          title={confirmDeleteList.isGroup ? 'מחיקת קבוצה' : 'מחיקת רשימה'}
          message={`למחוק את "${confirmDeleteList.name}"? פעולה זו לא ניתנת לביטול.`}
          confirmText="מחק"
          onConfirm={() => { onDeleteList(confirmDeleteList.id); setConfirmDeleteList(null); }}
          onCancel={() => setConfirmDeleteList(null)}
        />
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <Modal title="התראות" onClose={() => setShowNotifications(false)}>
          {myNotifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2.5 }}>
              <Typography sx={{ fontSize: 48 }}>🔔</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 15, mt: 1.5 }}>אין התראות חדשות</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {myNotifications.map((n: Notification & { listName: string; listId: string }) => {
                const isLeave = n.type === 'leave';
                return (
                  <Box key={n.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, bgcolor: isLeave ? '#FEF2F2' : '#F0FDF4', borderRadius: '12px', border: `1px solid ${isLeave ? '#FECACA' : '#BBF7D0'}` }}>
                    <Avatar sx={{ bgcolor: isLeave ? 'error.main' : 'success.main', width: 40, height: 40 }}>
                      {isLeave ? '👋' : '🎉'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: isLeave ? '#991B1B' : '#166534' }}>
                        {n.userName} {isLeave ? 'עזב/ה את הקבוצה' : 'הצטרף/ה לקבוצה'}
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: isLeave ? '#B91C1C' : '#15803D' }}>{n.listName}</Typography>
                    </Box>
                  </Box>
                );
              })}
              <Button variant="contained" fullWidth sx={{ mt: 1 }} onClick={() => {
                myNotifications.forEach((n: Notification & { listName: string; listId: string }) => onMarkNotificationsRead(n.listId));
                setShowNotifications(false);
              }}>
                סמן הכל כנקרא
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
          bgcolor: 'white',
          borderTop: '1px solid #E5E7EB',
          pb: 'env(safe-area-inset-bottom)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: { xs: 6, sm: 8 },
          py: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 4 }
        }}
      >
        <Box
          onClick={() => {}}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            px: { xs: 2.5, sm: 3 },
            py: 1,
            borderRadius: '12px',
            bgcolor: '#F0FDFA',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <HomeIcon sx={{ fontSize: { xs: 24, sm: 26 }, color: 'primary.main' }} />
          <Typography sx={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 700, color: 'primary.main' }}>בית</Typography>
        </Box>
        <Box
          onClick={() => setShowMenu(true)}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            px: { xs: 2.5, sm: 3 },
            py: 1,
            borderRadius: '12px',
            cursor: 'pointer',
            '&:active': { bgcolor: '#F0FDFA' }
          }}
        >
          <AddIcon sx={{ fontSize: { xs: 24, sm: 26 }, color: '#6B7280' }} />
          <Typography sx={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 500, color: '#6B7280' }}>חדש</Typography>
        </Box>
      </Box>
    </Box>
  );
};
