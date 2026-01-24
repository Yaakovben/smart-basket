import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, IconButton, Tabs, Tab,
  Chip, Avatar, Fab, Select, MenuItem, InputAdornment, Alert, FormControl
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import type { Product, Member, List, User } from '../../../global/types';
import { haptic, CATEGORY_ICONS, LIST_ICONS, GROUP_ICONS, LIST_COLORS, generateInviteMessage, generateShareListMessage } from '../../../global/helpers';
import { Modal, ConfirmModal, MemberAvatar, MembersButton } from '../../../global/components';
import { SwipeItem } from './SwipeItem';

type ProductUnit = 'יח׳' | 'ק״ג' | 'גרם' | 'ליטר';
type ProductCategory = 'מוצרי חלב' | 'מאפים' | 'ירקות' | 'פירות' | 'בשר' | 'משקאות' | 'ממתקים' | 'ניקיון' | 'אחר';

interface ListPageProps {
  list: List;
  user: User;
  onBack: () => void;
  onUpdateList: (list: List) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  showToast: (message: string) => void;
}

export const ListComponent = ({ list, onBack, onUpdateList, onLeaveList, onDeleteList, showToast, user }: ListPageProps) => {
  const [filter, setFilter] = useState<'pending' | 'purchased'>('pending');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Product | null>(null);
  const [showDetails, setShowDetails] = useState<Product | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showShareList, setShowShareList] = useState(false);
  const [showEditList, setShowEditList] = useState(false);
  const [editListData, setEditListData] = useState<{ name: string; icon: string; color: string } | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [newP, setNewP] = useState<{ name: string; quantity: number; unit: ProductUnit; category: ProductCategory }>({ name: '', quantity: 1, unit: 'יח׳', category: 'אחר' });
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(() => !localStorage.getItem('sb_hint_seen'));
  const [addError, setAddError] = useState('');

  const [fabPosition, setFabPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    const currentX = fabPosition?.x ?? window.innerWidth / 2;
    const currentY = fabPosition?.y ?? window.innerHeight - 90;
    dragRef.current = { startX: clientX, startY: clientY, startPosX: currentX, startPosY: currentY };
    setIsDragging(true);
  }, [fabPosition]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current || !isDragging) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    const newX = Math.max(40, Math.min(window.innerWidth - 40, dragRef.current.startPosX + dx));
    const newY = Math.max(100, Math.min(window.innerHeight - 60, dragRef.current.startPosY + dy));
    setFabPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
  }, []);

  const dismissHint = () => { setShowHint(false); localStorage.setItem('sb_hint_seen', 'true'); };

  const pending = list.products.filter((p: Product) => !p.isPurchased);
  const purchased = list.products.filter((p: Product) => p.isPurchased);
  const items = (filter === 'pending' ? pending : purchased).filter((p: Product) => p.name.includes(search));
  const allMembers = [list.owner, ...list.members];

  useEffect(() => {
    if (items.length <= 5) setFabPosition(null);
  }, [items.length]);

  const isOwner = list.owner.id === user.id;
  const updateP = (products: Product[]) => onUpdateList({ ...list, products });

  const handleAdd = () => {
    setAddError('');
    if (!newP.name.trim()) { setAddError('נא להזין שם מוצר'); return; }
    if (newP.name.length < 2) { setAddError('שם המוצר חייב להכיל לפחות 2 תווים'); return; }
    if (newP.quantity < 1) { setAddError('כמות חייבת להיות לפחות 1'); return; }
    setOpenItemId(null);
    const now = new Date();
    const date = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    updateP([...list.products, { id: `p${Date.now()}`, ...newP, isPurchased: false, addedBy: user.name, createdDate: date, createdTime: time }]);
    setNewP({ name: '', quantity: 1, unit: 'יח׳', category: 'אחר' });
    setShowAdd(false);
    showToast('נוסף');
  };

  const handleEditList = () => {
    setEditListData({ name: list.name, icon: list.icon, color: list.color });
    setShowEditList(true);
  };

  const saveListChanges = () => {
    onUpdateList({ ...list, ...editListData });
    setShowEditList(false);
    showToast('נשמר');
  };

  const handleDeleteList = () => {
    onDeleteList(list.id);
    onBack();
  };

  const removeMember = (mid: string) => {
    setConfirm({ title: 'הסרת חבר', message: 'להסיר חבר זה מהרשימה?', onConfirm: () => { onUpdateList({ ...list, members: list.members.filter((m: Member) => m.id !== mid) }); setConfirm(null); showToast('הוסר'); } });
  };

  const leaveList = () => {
    setConfirm({ title: 'עזיבת רשימה', message: 'לעזוב את הרשימה?', onConfirm: () => { onLeaveList(list.id); setConfirm(null); } });
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default', direction: 'rtl', maxWidth: 430, mx: 'auto', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', p: '48px 20px 20px', borderRadius: '0 0 24px 24px', flexShrink: 0, boxShadow: '0 4px 16px rgba(79, 70, 229, 0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <IconButton onClick={onBack} sx={{ bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
            <ArrowForwardIcon sx={{ color: 'white' }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 18, fontWeight: 700, textAlign: 'center' }}>{list.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isOwner && (
              <IconButton onClick={handleEditList} sx={{ bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
                <EditIcon sx={{ color: 'white', fontSize: 18 }} />
              </IconButton>
            )}
            <IconButton onClick={() => setShowShareList(true)} sx={{ bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
              <ShareIcon sx={{ color: 'white', fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {list.isGroup && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <MembersButton members={allMembers} onClick={() => setShowMembers(true)} />
            <IconButton onClick={() => setShowInvite(true)} sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <PersonAddIcon sx={{ color: 'white', fontSize: 20 }} />
            </IconButton>
          </Box>
        )}

        <TextField
          fullWidth
          placeholder="חפש מוצר..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: 3 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9CA3AF' }} /></InputAdornment> }}
        />

        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          variant="fullWidth"
          sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            borderRadius: 2.5,
            p: 0.5,
            minHeight: 'auto',
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              borderRadius: 2,
              py: 1.25,
              minHeight: 'auto',
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              textTransform: 'none',
              '&.Mui-selected': { bgcolor: 'white', color: 'primary.main' }
            }
          }}
        >
          <Tab value="pending" label={`לקנות (${pending.length})`} />
          <Tab value="purchased" label={`נקנה (${purchased.length})`} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: items.length === 0 ? 'hidden' : 'auto', overflowX: 'hidden', p: 2, pb: '80px' }} onClick={() => setOpenItemId(null)}>
        {showHint && items.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px 16px', background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)', borderRadius: 3, mb: 1.5, border: '1px solid #99F6E4' }}>
            <Typography sx={{ fontSize: 24 }}>💡</Typography>
            <Typography sx={{ flex: 1, fontSize: 13, color: '#115E59' }}>
              <strong>טיפ:</strong> גרור שמאלה לפעולות • לחץ לפרטים
            </Typography>
            <IconButton size="small" onClick={dismissHint} sx={{ color: 'primary.main' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Box sx={{ width: 100, height: 100, borderRadius: '50%', background: filter === 'pending' ? 'linear-gradient(135deg, #CCFBF1, #99F6E4)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, fontSize: 56 }}>
              {filter === 'pending' ? '🎉' : '📦'}
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
              {filter === 'pending' ? 'כל הכבוד!' : 'אין מוצרים'}
            </Typography>
            <Typography sx={{ fontSize: 14, color: '#9CA3AF', mb: 3 }}>
              {filter === 'pending' ? 'כל המוצרים נקנו בהצלחה' : 'הוסף מוצרים חדשים לרשימה'}
            </Typography>
            {filter === 'pending' && (
              <Button variant="contained" onClick={() => { haptic('light'); setShowAdd(true); }} startIcon={<span>➕</span>}>
                הוסף מוצר
              </Button>
            )}
          </Box>
        ) : items.map((p: Product) => (
          <SwipeItem
            key={p.id}
            product={p}
            isPurchased={p.isPurchased}
            isOpen={openItemId === p.id}
            onOpen={() => setOpenItemId(p.id)}
            onClose={() => setOpenItemId(null)}
            onToggle={() => { updateP(list.products.map((x: Product) => x.id === p.id ? { ...x, isPurchased: !x.isPurchased } : x)); showToast('עודכן'); dismissHint(); }}
            onEdit={() => setShowEdit({ ...p })}
            onDelete={() => { updateP(list.products.filter((x: Product) => x.id !== p.id)); showToast('נמחק'); }}
            onClick={() => { setShowDetails(p); dismissHint(); }}
          />
        ))}
      </Box>

      {/* FAB */}
      {(items.length > 0 || filter === 'purchased') && (
        <Box
          sx={{
            position: 'fixed',
            bottom: fabPosition ? undefined : 70,
            left: fabPosition ? undefined : '50%',
            transform: fabPosition ? undefined : 'translateX(-50%)',
            top: fabPosition ? fabPosition.y - 28 : undefined,
            right: fabPosition ? window.innerWidth - fabPosition.x - 28 : undefined,
            zIndex: 5,
            touchAction: items.length > 5 ? 'none' : 'auto'
          }}
          onTouchStart={items.length > 5 ? (e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY) : undefined}
          onTouchMove={items.length > 5 ? (e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY) : undefined}
          onTouchEnd={items.length > 5 ? handleDragEnd : undefined}
          onMouseDown={items.length > 5 ? (e) => handleDragStart(e.clientX, e.clientY) : undefined}
          onMouseMove={items.length > 5 && isDragging ? (e) => handleDragMove(e.clientX, e.clientY) : undefined}
          onMouseUp={items.length > 5 ? handleDragEnd : undefined}
          onMouseLeave={items.length > 5 ? handleDragEnd : undefined}
        >
          {items.length > 5 ? (
            <Fab color="primary" onClick={() => { if (!isDragging) { haptic('medium'); setShowAdd(true); } }} sx={{ cursor: isDragging ? 'grabbing' : 'grab', transition: isDragging ? 'none' : 'all 0.2s ease' }}>
              <AddIcon />
            </Fab>
          ) : (
            <Button variant="contained" onClick={() => { haptic('medium'); setShowAdd(true); }} startIcon={<AddIcon />} sx={{ borderRadius: 50, px: 2.5, py: 1.5, boxShadow: '0 6px 20px rgba(20, 184, 166, 0.5)' }}>
              הוסף מוצר
            </Button>
          )}
        </Box>
      )}

      {/* Add Product Modal */}
      {showAdd && (
        <Modal title="מוצר חדש" onClose={() => { setShowAdd(false); setAddError(''); }}>
          {addError && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>⚠️ {addError}</Alert>}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>שם</Typography>
            <TextField fullWidth value={newP.name} onChange={e => { setNewP({ ...newP, name: e.target.value }); setAddError(''); }} placeholder="חלב תנובה" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>כמות</Typography>
              <Box sx={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: 3, overflow: 'hidden', height: 52 }}>
                <Button onClick={() => setNewP({ ...newP, quantity: Math.max(1, newP.quantity - 1) })} sx={{ minWidth: 52, borderRadius: 0, bgcolor: '#F9FAFB', fontSize: 24 }}>−</Button>
                <input type="number" min="1" style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 600, outline: 'none', width: 50 }} value={newP.quantity} onChange={e => setNewP({ ...newP, quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
                <Button onClick={() => setNewP({ ...newP, quantity: newP.quantity + 1 })} sx={{ minWidth: 52, borderRadius: 0, bgcolor: '#F9FAFB', fontSize: 24 }}>+</Button>
              </Box>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>יחידה</Typography>
              <FormControl fullWidth>
                <Select value={newP.unit} onChange={e => setNewP({ ...newP, unit: e.target.value as ProductUnit })} sx={{ height: 52 }}>
                  <MenuItem value="יח׳">יח׳</MenuItem>
                  <MenuItem value="ק״ג">ק״ג</MenuItem>
                  <MenuItem value="גרם">גרם</MenuItem>
                  <MenuItem value="ליטר">ליטר</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>קטגוריה</Typography>
            <FormControl fullWidth>
              <Select value={newP.category} onChange={e => setNewP({ ...newP, category: e.target.value as ProductCategory })}>
                {Object.keys(CATEGORY_ICONS).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Button variant="contained" fullWidth onClick={() => { haptic('medium'); handleAdd(); }}>הוסף</Button>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {showEdit && (
        <Modal title="ערוך מוצר" onClose={() => setShowEdit(null)}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>שם</Typography>
            <TextField fullWidth value={showEdit.name} onChange={e => setShowEdit({ ...showEdit, name: e.target.value })} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>כמות</Typography>
              <Box sx={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: 3, overflow: 'hidden', height: 52 }}>
                <Button onClick={() => setShowEdit({ ...showEdit, quantity: Math.max(1, showEdit.quantity - 1) })} sx={{ minWidth: 52, borderRadius: 0, bgcolor: '#F9FAFB', fontSize: 24 }}>−</Button>
                <input type="number" min="1" style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 600, outline: 'none', width: 50 }} value={showEdit.quantity} onChange={e => setShowEdit({ ...showEdit, quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
                <Button onClick={() => setShowEdit({ ...showEdit, quantity: showEdit.quantity + 1 })} sx={{ minWidth: 52, borderRadius: 0, bgcolor: '#F9FAFB', fontSize: 24 }}>+</Button>
              </Box>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>יחידה</Typography>
              <FormControl fullWidth>
                <Select value={showEdit.unit} onChange={e => setShowEdit({ ...showEdit, unit: e.target.value as ProductUnit })} sx={{ height: 52 }}>
                  <MenuItem value="יח׳">יח׳</MenuItem>
                  <MenuItem value="ק״ג">ק״ג</MenuItem>
                  <MenuItem value="גרם">גרם</MenuItem>
                  <MenuItem value="ליטר">ליטר</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>קטגוריה</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
                <Chip key={cat} label={`${icon} ${cat}`} onClick={() => setShowEdit({ ...showEdit, category: cat as ProductCategory })} variant={showEdit.category === cat ? 'filled' : 'outlined'} color={showEdit.category === cat ? 'primary' : 'default'} sx={{ cursor: 'pointer' }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={() => { haptic('medium'); updateP(list.products.map((x: Product) => x.id === showEdit.id ? showEdit : x)); setShowEdit(null); showToast('נשמר'); }}>שמור</Button>
        </Modal>
      )}

      {/* Product Details Modal */}
      {showDetails && (
        <Modal title="פרטים" onClose={() => setShowDetails(null)}>
          <Box sx={{ textAlign: 'center', mb: 2.5 }}>
            <Typography sx={{ fontSize: 56 }}>{CATEGORY_ICONS[showDetails.category]}</Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700, mt: 1.5 }}>{showDetails.name}</Typography>
          </Box>
          <Box sx={{ bgcolor: '#F9FAFB', borderRadius: 3 }}>
            {([['כמות', `${showDetails.quantity} ${showDetails.unit}`], ['קטגוריה', showDetails.category], ['נוסף ע״י', showDetails.addedBy], ['תאריך', showDetails.createdDate || '-'], ['שעה', showDetails.createdTime || '-']] as [string, string][]).map(([l, v], i, a) => (
              <Box key={l} sx={{ display: 'flex', justifyContent: 'space-between', p: '12px 16px', borderBottom: i < a.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                <Typography sx={{ color: 'text.secondary' }}>{l}</Typography>
                <Typography sx={{ fontWeight: 600 }}>{v}</Typography>
              </Box>
            ))}
          </Box>
        </Modal>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={() => setShowInvite(false)} />
          <Box sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'white', borderRadius: 5, p: 3, zIndex: 1001, width: '90%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <IconButton onClick={() => setShowInvite(false)} sx={{ position: 'absolute', top: 12, left: 12, bgcolor: '#F3F4F6' }} size="small">
              <CloseIcon sx={{ fontSize: 16, color: '#6B7280' }} />
            </IconButton>
            <Box sx={{ textAlign: 'center', mb: 2.5 }}>
              <Avatar sx={{ width: 64, height: 64, background: 'linear-gradient(135deg, #14B8A6, #0D9488)', mx: 'auto', mb: 2, boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
                <PersonAddIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>הזמן חברים</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>שתף את הפרטים להצטרפות לקבוצה</Typography>
            </Box>
            <Box sx={{ bgcolor: '#F0FDFA', borderRadius: 3, border: '2px solid #99F6E4', mb: 2.5, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '14px 16px', borderBottom: '1px solid #99F6E4' }}>
                <Typography sx={{ color: '#115E59', fontSize: 13, fontWeight: 600 }}>קוד קבוצה</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#115E59', letterSpacing: 3, fontFamily: 'monospace' }}>{list.inviteCode}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '14px 16px' }}>
                <Typography sx={{ color: '#115E59', fontSize: 13, fontWeight: 600 }}>סיסמה</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#115E59', letterSpacing: 3, fontFamily: 'monospace' }}>{list.password}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <Button variant="outlined" fullWidth onClick={() => { navigator.clipboard?.writeText(generateInviteMessage(list)).then(() => { showToast('הועתק!'); setShowInvite(false); }).catch(() => showToast('שגיאה בהעתקה')); }}>
                📋 העתק
              </Button>
              <Button fullWidth onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateInviteMessage(list))}`)} sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#1ebe5a' } }}>
                וואטסאפ
              </Button>
            </Box>
          </Box>
        </>
      )}

      {/* Members Modal */}
      {showMembers && (
        <Modal title="חברים" onClose={() => setShowMembers(false)}>
          {allMembers.map((m, i) => (
            <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, borderBottom: i < allMembers.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <MemberAvatar member={m} size={44} index={i} />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{m.name}</Typography>
                  {m.id === list.owner.id && <Chip label="מנהל" size="small" sx={{ bgcolor: '#FEF3C7', color: '#B45309', height: 22 }} />}
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{m.email}</Typography>
              </Box>
              {isOwner && m.id !== list.owner.id && (
                <IconButton onClick={() => removeMember(m.id)} sx={{ bgcolor: '#FEE2E2' }} size="small">
                  <CloseIcon sx={{ color: 'error.main', fontSize: 18 }} />
                </IconButton>
              )}
            </Box>
          ))}
          {!isOwner && list.isGroup && (
            <Button fullWidth onClick={leaveList} sx={{ mt: 2.5, bgcolor: '#FEE2E2', color: '#DC2626', '&:hover': { bgcolor: '#FECACA' } }}>
              עזוב רשימה
            </Button>
          )}
        </Modal>
      )}

      {/* Share List Modal */}
      {showShareList && (
        <>
          <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={() => setShowShareList(false)} />
          <Box sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'white', borderRadius: 5, p: 3, zIndex: 1001, width: '90%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <IconButton onClick={() => setShowShareList(false)} sx={{ position: 'absolute', top: 12, left: 12, bgcolor: '#F3F4F6' }} size="small">
              <CloseIcon sx={{ fontSize: 16, color: '#6B7280' }} />
            </IconButton>
            <Box sx={{ textAlign: 'center', mb: 2.5 }}>
              <Avatar sx={{ width: 64, height: 64, background: 'linear-gradient(135deg, #14B8A6, #0D9488)', mx: 'auto', mb: 2, boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
                <ShareIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>שתף רשימה</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>שלח את רשימת הקניות</Typography>
            </Box>
            <Box sx={{ bgcolor: '#F0FDFA', borderRadius: 3, border: '2px solid #99F6E4', mb: 2.5, overflow: 'hidden' }}>
              <Box sx={{ p: '12px 16px', borderBottom: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#115E59' }}>{list.name}</Typography>
                <Chip label={`${list.products.filter((p: Product) => !p.isPurchased).length} פריטים`} size="small" sx={{ bgcolor: 'transparent', color: 'primary.main' }} />
              </Box>
              <Box sx={{ p: '12px 16px', maxHeight: 140, overflow: 'auto' }}>
                {list.products.filter((p: Product) => !p.isPurchased).length === 0 ? (
                  <Typography sx={{ color: '#64748B', fontSize: 14, textAlign: 'center', py: 1 }}>הרשימה ריקה</Typography>
                ) : (
                  list.products.filter((p: Product) => !p.isPurchased).slice(0, 5).map((p: Product, i: number, arr: Product[]) => (
                    <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: i < arr.length - 1 ? '1px solid #CCFBF1' : 'none' }}>
                      <Typography sx={{ fontSize: 14, color: '#115E59' }}>• {p.name}</Typography>
                      <Typography sx={{ fontSize: 13, color: 'primary.main' }}>{p.quantity} {p.unit}</Typography>
                    </Box>
                  ))
                )}
                {list.products.filter((p: Product) => !p.isPurchased).length > 5 && (
                  <Typography sx={{ fontSize: 13, color: 'primary.main', textAlign: 'center', pt: 1 }}>+ עוד {list.products.filter((p: Product) => !p.isPurchased).length - 5} פריטים</Typography>
                )}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              <Button variant="outlined" fullWidth onClick={() => { navigator.clipboard?.writeText(generateShareListMessage(list)).then(() => { showToast('הועתק!'); setShowShareList(false); }).catch(() => showToast('שגיאה בהעתקה')); }}>
                📋 העתק
              </Button>
              <Button fullWidth onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateShareListMessage(list))}`)} sx={{ bgcolor: '#25D366', color: 'white', '&:hover': { bgcolor: '#1ebe5a' } }}>
                וואטסאפ
              </Button>
            </Box>
          </Box>
        </>
      )}

      {/* Edit List Modal */}
      {showEditList && editListData && (
        <Modal title={list.isGroup ? 'עריכת קבוצה' : 'עריכת רשימה'} onClose={() => setShowEditList(false)}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>שם</Typography>
            <TextField fullWidth value={editListData.name} onChange={e => setEditListData({ ...editListData, name: e.target.value })} />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>אייקון</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(list.isGroup ? GROUP_ICONS : LIST_ICONS).map(i => (
                <Button key={i} onClick={() => setEditListData({ ...editListData, icon: i })} sx={{ width: 48, height: 48, minWidth: 48, borderRadius: 3, border: editListData.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', bgcolor: editListData.icon === i ? '#F0FDFA' : 'white', fontSize: 22 }}>
                  {i}
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#374151', mb: 1 }}>צבע</Typography>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              {LIST_COLORS.map(c => (
                <Box key={c} onClick={() => setEditListData({ ...editListData, color: c })} sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: c, border: editListData.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />
              ))}
            </Box>
          </Box>
          <Button variant="contained" fullWidth onClick={saveListChanges}>שמור שינויים</Button>
          <Button fullWidth onClick={() => { setShowEditList(false); setConfirmDeleteList(true); }} sx={{ mt: 1.5, bgcolor: '#FEE2E2', color: '#DC2626', '&:hover': { bgcolor: '#FECACA' } }}>
            מחק {list.isGroup ? 'קבוצה' : 'רשימה'}
          </Button>
        </Modal>
      )}

      {confirmDeleteList && <ConfirmModal title={list.isGroup ? 'מחיקת קבוצה' : 'מחיקת רשימה'} message={`למחוק את "${list.name}"? פעולה זו לא ניתנת לביטול.`} confirmText="מחק" onConfirm={handleDeleteList} onCancel={() => setConfirmDeleteList(false)} />}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </Box>
  );
};
