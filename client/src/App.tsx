import { useState, useRef, useEffect } from 'react';

// ===== TypeScript Interfaces =====

// User & Authentication
interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarColor?: string;
  avatarEmoji?: string;
}

// Product Management
type ProductUnit = 'יח׳' | 'ק״ג' | 'גרם' | 'ליטר';
type ProductCategory = 'מוצרי חלב' | 'מאפים' | 'ירקות' | 'פירות' | 'בשר' | 'משקאות' | 'ניקיון' | 'אחר';

// Screen Management
type Screen = 'home' | 'profile' | 'settings' | 'stats';

interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  isPurchased: boolean;
  addedBy: string;
  createdDate?: string;
  createdTime?: string;
}

// List & Group Management
interface Member {
  id: string;
  name: string;
  email: string;
}

interface Notification {
  id: string;
  type: 'join' | 'leave';
  userId: string;
  userName: string;
  timestamp: string;
  read: boolean;
}

interface List {
  id: string;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: User;
  members: Member[];
  products: Product[];
  inviteCode?: string | null;
  password?: string | null;
  notifications?: Notification[];
}

// Component Props Interfaces
interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

interface MemberAvatarProps {
  member: Member | User;
  size?: number;
  index?: number;
}

interface MembersButtonProps {
  members: (Member | User)[];
  onClick: () => void;
}

interface SwipeItemProps {
  product: Product;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  isPurchased: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

interface ListScreenProps {
  list: List;
  onBack: () => void;
  onUpdateList: (list: List) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  showToast: (message: string) => void;
  user: User;
}

interface HomeScreenProps {
  lists: List[];
  onSelectList: (list: List) => void;
  onCreateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onEditList: (list: List) => void;
  onJoinGroup: (code: string, password: string) => { success: boolean; error?: string };
  onLogout: () => void;
  onUpdateUser: (user: Partial<User>) => void;
  onMarkNotificationsRead: (listId: string) => void;
  user: User;
}

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

interface ToastProps {
  msg: string;
  type?: ToastType;
}

// ===== Constants =====

// Professional Logo Component
const categoryIcons = { 'מוצרי חלב': '🧀', 'מאפים': '🍞', 'ירקות': '🥬', 'פירות': '🍎', 'בשר': '🥩', 'משקאות': '☕', 'ניקיון': '🧹', 'אחר': '📦' };
const memberColors = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4'];
const LIST_ICONS = ['📋', '📝', '✏️', '📌', '🗒️', '✅'];
const GROUP_ICONS = ['👨‍👩‍👧‍👦', '👥', '👫', '🏠', '💑', '👨‍👩‍👧'];
// Beautiful & Pleasant color palette
const COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
const ACTIONS_WIDTH = 200;

// ===== Utility Functions =====

// Haptic feedback for mobile
const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[style]);
  }
};

// Enhanced toast types
type ToastType = 'success' | 'error' | 'info' | 'warning';
const toastConfig = {
  success: { icon: '✓', bg: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34, 197, 94, 0.3)' },
  error: { icon: '✕', bg: 'linear-gradient(135deg, #EF4444, #DC2626)', shadow: 'rgba(239, 68, 68, 0.3)' },
  info: { icon: 'ℹ', bg: 'linear-gradient(135deg, #14B8A6, #0D9488)', shadow: 'rgba(20, 184, 166, 0.3)' },
  warning: { icon: '⚠', bg: 'linear-gradient(135deg, #F59E0B, #D97706)', shadow: 'rgba(245, 158, 11, 0.3)' }
};

function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'אישור' }: ConfirmModalProps) {
  return (
    <div
      style={{ ...S.overlay, animation: 'fadeIn 0.2s ease', alignItems: 'center' }}
      onClick={onCancel}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div style={{ ...S.confirmBox, animation: 'scaleIn 0.3s ease' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 12px', textAlign: 'center' }}>{title}</h3>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 24px', textAlign: 'center' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => { haptic('light'); onCancel(); }} style={S.cancelBtn}>ביטול</button>
          <button onClick={() => { haptic('medium'); onConfirm(); }} style={S.dangerBtn}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function MemberAvatar({ member, size = 36, index = 0 }: MemberAvatarProps) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: memberColors[index % memberColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.4, fontWeight: '700', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      {member.name.charAt(0)}
    </div>
  );
}

function MembersButton({ members, onClick }: MembersButtonProps) {
  const firstMember = members[0];
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '20px', padding: '6px 16px 6px 8px', cursor: 'pointer' }}>
      <MemberAvatar member={firstMember} size={28} index={0} />
      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600' }}>{members.length} חברים</span>
    </button>
  );
}

function SwipeItem({ product, onToggle, onEdit, onDelete, onClick, isPurchased, isOpen, onOpen, onClose }: SwipeItemProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOff = useRef(0);
  const icon = categoryIcons[product.category as ProductCategory] || '📦';

  const handlers = {
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startOff.current = offset;
      setSwiping(false);
    },
    onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => {
      const dx = startX.current - e.touches[0].clientX;
      const dy = Math.abs(e.touches[0].clientY - startY.current);

      if (!swiping && Math.abs(dx) > 10 && Math.abs(dx) > dy) {
        setSwiping(true);
        document.body.style.overflow = 'hidden';
      }

      if (swiping) {
        e.preventDefault();
        setOffset(Math.max(0, Math.min(ACTIONS_WIDTH, startOff.current + dx)));
      }
    },
    onTouchEnd: () => {
      document.body.style.overflow = '';
      if (swiping) {
        if (offset > 60) {
          setOffset(ACTIONS_WIDTH);
          onOpen();
        } else {
          setOffset(0);
          if (isOpen) onClose();
        }
      }
      setSwiping(false);
    }
  };

  const doAction = (fn: () => void) => { setOffset(0); onClose(); fn(); };

  return (
    <div style={{ position: 'relative', marginBottom: '10px', borderRadius: '14px', height: '72px', overflow: 'hidden', background: '#F3F4F6' }}>
      {offset > 0 && (
        <div style={{ position: 'absolute' as const, top: 0, right: 0, bottom: 0, width: ACTIONS_WIDTH, display: 'flex', flexDirection: 'row-reverse' as const }}>
          <div onClick={() => { haptic('medium'); doAction(onDelete); }} style={{ ...S.actionBtn, background: '#EF4444' }}><span>🗑️</span><span style={S.actionLabel}>מחק</span></div>
          <div onClick={() => { haptic('light'); doAction(onEdit); }} style={{ ...S.actionBtn, background: '#14B8A6' }}><span>✏️</span><span style={S.actionLabel}>ערוך</span></div>
          <div onClick={() => { haptic('light'); doAction(onToggle); }} style={{ ...S.actionBtn, background: isPurchased ? '#F59E0B' : '#22C55E' }}>
            <span>{isPurchased ? '↩️' : '✓'}</span><span style={S.actionLabel}>{isPurchased ? 'החזר' : 'נקנה'}</span>
          </div>
        </div>
      )}
      {/* Swipe indicator */}
      {offset > 0 && offset < ACTIONS_WIDTH && (
        <div style={{
          position: 'absolute' as const,
          right: offset - 30,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '20px',
          opacity: Math.min(offset / 60, 1),
          pointerEvents: 'none'
        }}>➤</div>
      )}
      <div
        {...handlers}
        onClick={() => {
          if (offset > 10) {
            setOffset(0);
            onClose();
          } else {
            haptic('light');
            onClick();
          }
        }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: isPurchased ? '#FAFAFA' : 'white',
          padding: '0 14px',
          borderRadius: '14px',
          border: '1px solid #E5E7EB',
          transform: `translateX(-${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
          boxShadow: offset > 0 ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isPurchased ? '#F3F4F6' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', transition: 'transform 0.2s ease' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: isPurchased ? '#9CA3AF' : '#111827', textDecoration: isPurchased ? 'line-through' : 'none' }}>{product.name}</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>{product.quantity} {product.unit} • {product.addedBy}</div>
        </div>
        {isPurchased && <span style={{ fontSize: '20px' }}>✅</span>}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      style={{ ...S.overlay, animation: 'fadeIn 0.2s ease' }}
      onClick={() => { haptic('light'); onClose(); }}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        style={{ ...S.sheet, animation: 'slideUp 0.3s ease' }}
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        <div style={S.handle} />
        <h2 style={S.sheetTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ListScreen({ list, onBack, onUpdateList, onLeaveList, onDeleteList, showToast, user }: ListScreenProps) {
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

  const dismissHint = () => { setShowHint(false); localStorage.setItem('sb_hint_seen', 'true'); };

  const pending = list.products.filter(p => !p.isPurchased);
  const purchased = list.products.filter(p => p.isPurchased);
  const items = (filter === 'pending' ? pending : purchased).filter(p => p.name.includes(search));
  const allMembers = [list.owner, ...list.members];
  const isOwner = list.owner.id === user.id;

  const updateP = (products: Product[]) => onUpdateList({ ...list, products });

  const handleAdd = () => {
    setAddError('');
    if (!newP.name.trim()) {
      setAddError('נא להזין שם מוצר');
      return;
    }
    if (newP.name.length < 2) {
      setAddError('שם המוצר חייב להכיל לפחות 2 תווים');
      return;
    }
    if (newP.quantity < 1) {
      setAddError('כמות חייבת להיות לפחות 1');
      return;
    }
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
    <div style={S.screen}>
      <div style={S.header}>
        <div style={S.headerRow}>
          <button style={S.iconBtn} onClick={onBack}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
          <h1 style={S.title}>{list.name}</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isOwner && <button style={S.iconBtn} onClick={handleEditList}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>}
            <button style={S.iconBtn} onClick={() => setShowShareList(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>
        </div>
        {list.isGroup && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <MembersButton members={allMembers} onClick={() => setShowMembers(true)} />
            <button onClick={() => setShowInvite(true)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="17" y1="11" x2="23" y2="11"/>
              </svg>
            </button>
          </div>
        )}
        <div style={S.searchBox}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="חפש מוצר..." value={search} onChange={e => setSearch(e.target.value)} style={S.searchInput} /></div>
        <div style={S.tabs}>
          <button style={{ ...S.tab, ...(filter === 'pending' ? S.tabActive : {}) }} onClick={() => setFilter('pending')}>לקנות ({pending.length})</button>
          <button style={{ ...S.tab, ...(filter === 'purchased' ? S.tabActive : {}) }} onClick={() => setFilter('purchased')}>נקנה ({purchased.length})</button>
        </div>
      </div>

      <div style={S.content} onClick={() => setOpenItemId(null)}>
        {showHint && items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)', borderRadius: '12px', marginBottom: '12px', border: '1px solid #99F6E4' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <div style={{ flex: 1, fontSize: '13px', color: '#115E59' }}>
              <strong>טיפ:</strong> גרור שמאלה לפעולות • לחץ לפרטים
            </div>
            <button onClick={dismissHint} style={{ background: 'none', border: 'none', color: '#14B8A6', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>✕</button>
          </div>
        )}
        {items.length === 0 ? (
          <div style={{ ...S.empty, animation: 'fadeIn 0.5s ease' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: filter === 'pending' ? 'linear-gradient(135deg, #CCFBF1, #99F6E4)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '56px' }}>
              {filter === 'pending' ? '🎉' : '📦'}
            </div>
            <p style={{ ...S.emptyText, marginBottom: '8px' }}>{filter === 'pending' ? 'כל הכבוד!' : 'אין מוצרים'}</p>
            <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '24px' }}>
              {filter === 'pending' ? 'כל המוצרים נקנו בהצלחה' : 'הוסף מוצרים חדשים לרשימה'}
            </p>
            {filter === 'pending' && (
              <button
                onClick={() => { haptic('light'); setShowAdd(true); }}
                style={{ ...S.primaryBtn, maxWidth: '200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span>➕</span>
                <span>הוסף מוצר</span>
              </button>
            )}
          </div>
        ) : items.map(p => (
          <SwipeItem 
            key={p.id} 
            product={p} 
            isPurchased={p.isPurchased} 
            isOpen={openItemId === p.id}
            onOpen={() => setOpenItemId(p.id)}
            onClose={() => setOpenItemId(null)}
            onToggle={() => { updateP(list.products.map(x => x.id === p.id ? { ...x, isPurchased: !x.isPurchased } : x)); showToast('עודכן'); dismissHint(); }} 
            onEdit={() => setShowEdit({ ...p })} 
            onDelete={() => { updateP(list.products.filter(x => x.id !== p.id)); showToast('נמחק'); }} 
            onClick={() => { setShowDetails(p); dismissHint(); }} 
          />
        ))}
      </div>

      {/* Floating Action Button - only show when there are items OR when viewing purchased */}
      {(items.length > 0 || filter === 'purchased') && (
        <div style={{ position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 5 }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: items.length > 5 ? '0' : '8px',
              padding: items.length > 5 ? '16px' : '14px 24px',
              width: items.length > 5 ? '56px' : 'auto',
              height: items.length > 5 ? '56px' : 'auto',
              borderRadius: '50px',
              border: 'none',
              background: 'linear-gradient(135deg, #14B8A6, #10B981)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(20, 184, 166, 0.5)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => { haptic('medium'); setShowAdd(true); }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {items.length <= 5 && <span>הוסף מוצר</span>}
          </button>
        </div>
      )}

      {showAdd && <Modal title="מוצר חדש" onClose={() => { setShowAdd(false); setAddError(''); }}>
        {addError && <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', color: '#DC2626', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>⚠️ {addError}</div>}
        <div style={S.formGroup}><label style={S.label}>שם</label><input style={S.input} value={newP.name} onChange={e => { setNewP({ ...newP, name: e.target.value }); setAddError(''); }} placeholder="חלב תנובה" /></div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ ...S.formGroup, flex: 1 }}>
            <label style={S.label}>כמות</label>
            <div style={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', height: '52px' }}>
              <button onClick={() => setNewP({ ...newP, quantity: Math.max(1, newP.quantity - 1) })} style={{ width: '52px', border: 'none', background: '#F9FAFB', fontSize: '24px', cursor: 'pointer' }}>−</button>
              <input type="number" min="1" style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: '20px', fontWeight: '600', outline: 'none', width: '50px' }} value={newP.quantity} onChange={e => setNewP({ ...newP, quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
              <button onClick={() => setNewP({ ...newP, quantity: newP.quantity + 1 })} style={{ width: '52px', border: 'none', background: '#F9FAFB', fontSize: '24px', cursor: 'pointer' }}>+</button>
            </div>
          </div>
          <div style={{ ...S.formGroup, flex: 1 }}><label style={S.label}>יחידה</label><select style={{ ...S.input, height: '52px', fontSize: '16px' }} value={newP.unit} onChange={e => setNewP({ ...newP, unit: e.target.value as ProductUnit })}><option>יח׳</option><option>ק״ג</option><option>גרם</option><option>ליטר</option></select></div>
        </div>
        <div style={S.formGroup}><label style={S.label}>קטגוריה</label><select style={S.input} value={newP.category} onChange={e => setNewP({ ...newP, category: e.target.value as ProductCategory })}>{Object.keys(categoryIcons).map(c => <option key={c}>{c}</option>)}</select></div>
        <button style={S.primaryBtn} onClick={() => { haptic('medium'); handleAdd(); }}>הוסף</button>
      </Modal>}

      {showEdit && <Modal title="ערוך מוצר" onClose={() => setShowEdit(null)}>
        <div style={S.formGroup}><label style={S.label}>שם</label><input style={S.input} value={showEdit.name} onChange={e => setShowEdit({ ...showEdit, name: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ ...S.formGroup, flex: 1 }}>
            <label style={S.label}>כמות</label>
            <div style={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', height: '52px' }}>
              <button onClick={() => setShowEdit({ ...showEdit, quantity: Math.max(1, showEdit.quantity - 1) })} style={{ width: '52px', border: 'none', background: '#F9FAFB', fontSize: '24px', cursor: 'pointer' }}>−</button>
              <input type="number" min="1" style={{ flex: 1, border: 'none', textAlign: 'center', fontSize: '20px', fontWeight: '600', outline: 'none', width: '50px' }} value={showEdit.quantity} onChange={e => setShowEdit({ ...showEdit, quantity: Math.max(1, parseInt(e.target.value) || 1) })} />
              <button onClick={() => setShowEdit({ ...showEdit, quantity: showEdit.quantity + 1 })} style={{ width: '52px', border: 'none', background: '#F9FAFB', fontSize: '24px', cursor: 'pointer' }}>+</button>
            </div>
          </div>
          <div style={{ ...S.formGroup, flex: 1 }}><label style={S.label}>יחידה</label><select style={{ ...S.input, height: '52px', fontSize: '16px' }} value={showEdit.unit} onChange={e => setShowEdit({ ...showEdit, unit: e.target.value as ProductUnit })}><option>יח׳</option><option>ק״ג</option><option>גרם</option><option>ליטר</option></select></div>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>קטגוריה</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(categoryIcons).map(([cat, icon]) => (
              <button key={cat} onClick={() => setShowEdit({ ...showEdit, category: cat as ProductCategory })} style={{ padding: '8px 12px', borderRadius: '10px', border: showEdit.category === cat ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: showEdit.category === cat ? '#F0FDFA' : '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{icon}</span><span>{cat}</span>
              </button>
            ))}
          </div>
        </div>
        <button style={S.primaryBtn} onClick={() => { haptic('medium'); updateP(list.products.map(x => x.id === showEdit.id ? showEdit : x)); setShowEdit(null); showToast('נשמר'); }}>שמור</button>
      </Modal>}

      {showDetails && <Modal title="פרטים" onClose={() => setShowDetails(null)}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}><span style={{ fontSize: '56px' }}>{categoryIcons[showDetails.category]}</span><h3 style={{ fontSize: '20px', fontWeight: '700', margin: '12px 0' }}>{showDetails.name}</h3></div>
        <div style={{ background: '#F9FAFB', borderRadius: '12px' }}>{[['כמות', `${showDetails.quantity} ${showDetails.unit}`], ['קטגוריה', showDetails.category], ['נוסף ע״י', showDetails.addedBy], ['תאריך', showDetails.createdDate || '-'], ['שעה', showDetails.createdTime || '-']].map(([l, v], i, a) => <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < a.length - 1 ? '1px solid #E5E7EB' : 'none' }}><span style={{ color: '#6B7280' }}>{l}</span><span style={{ fontWeight: '600' }}>{v}</span></div>)}</div>
      </Modal>}

      {showInvite && <>
        <div style={S.overlay} onClick={() => setShowInvite(false)} />
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '20px', padding: '24px', zIndex: 1001, width: '90%', maxWidth: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <button onClick={() => setShowInvite(false)} style={{ position: 'absolute', top: '12px', left: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #14B8A6, #0D9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px', color: '#111827' }}>הזמן חברים</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>שתף את הפרטים להצטרפות לקבוצה</p>
          </div>
          <div style={{ background: '#F0FDFA', borderRadius: '12px', border: '2px solid #99F6E4', marginBottom: '20px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #99F6E4' }}>
              <span style={{ color: '#115E59', fontSize: '13px', fontWeight: '600' }}>קוד קבוצה</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#115E59', letterSpacing: '3px', fontFamily: 'monospace' }}>{list.inviteCode}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
              <span style={{ color: '#115E59', fontSize: '13px', fontWeight: '600' }}>סיסמה</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#115E59', letterSpacing: '3px', fontFamily: 'monospace' }}>{list.password}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #E5E7EB', background: 'white', fontSize: '14px', fontWeight: '700', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                navigator.clipboard?.writeText(`הצטרף לקבוצה "${list.name}"!\n\nקוד: ${list.inviteCode}\nסיסמה: ${list.password}`)
                  .then(() => {
                    showToast('הועתק!');
                    setShowInvite(false);
                  })
                  .catch(() => showToast('שגיאה בהעתקה'));
              }}
            >
              📋 העתק
            </button>
            <button 
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#25D366', fontSize: '14px', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`הצטרף לקבוצה "${list.name}"!\n\nקוד: ${list.inviteCode}\nסיסמה: ${list.password}`)}`)}
            >
              וואטסאפ
            </button>
          </div>
        </div>
      </>}

      {showMembers && <Modal title="חברים" onClose={() => setShowMembers(false)}>
        {allMembers.map((m, i) => <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i < allMembers.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
          <MemberAvatar member={m} size={44} index={i} />
          <div style={{ flex: 1 }}><div style={{ fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>{m.name}{m.id === list.owner.id && <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>מנהל</span>}</div><div style={{ fontSize: '13px', color: '#6B7280' }}>{m.email}</div></div>
          {isOwner && m.id !== list.owner.id && <button onClick={() => removeMember(m.id)} style={{ background: '#FEE2E2', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
        </div>)}
        {!isOwner && list.isGroup && <button style={{ ...S.dangerBtnFull, marginTop: '20px' }} onClick={leaveList}>עזוב רשימה</button>}
      </Modal>}

      {showShareList && <>
        <div style={S.overlay} onClick={() => setShowShareList(false)} />
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '20px', padding: '24px', zIndex: 1001, width: '90%', maxWidth: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <button onClick={() => setShowShareList(false)} style={{ position: 'absolute', top: '12px', left: '12px', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #14B8A6, #0D9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 4px', color: '#111827' }}>שתף רשימה</h3>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>שלח את רשימת הקניות</p>
          </div>
          <div style={{ background: '#F0FDFA', borderRadius: '12px', border: '2px solid #99F6E4', marginBottom: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #99F6E4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#115E59' }}>{list.name}</span>
              <span style={{ fontSize: '13px', color: '#14B8A6', fontWeight: '600' }}>{list.products.filter(p => !p.isPurchased).length} פריטים</span>
            </div>
            <div style={{ padding: '12px 16px', maxHeight: '140px', overflow: 'auto' }}>
              {list.products.filter(p => !p.isPurchased).length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '8px 0' }}>הרשימה ריקה</div>
              ) : (
                list.products.filter(p => !p.isPurchased).slice(0, 5).map((p, i, arr) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid #CCFBF1' : 'none' }}>
                    <span style={{ fontSize: '14px', color: '#115E59' }}>• {p.name}</span>
                    <span style={{ fontSize: '13px', color: '#14B8A6' }}>{p.quantity} {p.unit}</span>
                  </div>
                ))
              )}
              {list.products.filter(p => !p.isPurchased).length > 5 && (
                <div style={{ fontSize: '13px', color: '#14B8A6', textAlign: 'center', paddingTop: '8px' }}>+ עוד {list.products.filter(p => !p.isPurchased).length - 5} פריטים</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #E5E7EB', background: 'white', fontSize: '14px', fontWeight: '700', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                navigator.clipboard?.writeText(`${list.name}\n${list.products.filter(p => !p.isPurchased).map(p => `• ${p.name} - ${p.quantity} ${p.unit}`).join('\n')}`)
                  .then(() => {
                    showToast('הועתק!');
                    setShowShareList(false);
                  })
                  .catch(() => showToast('שגיאה בהעתקה'));
              }}
            >
              📋 העתק
            </button>
            <button 
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#25D366', fontSize: '14px', fontWeight: '700', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${list.name}\n${list.products.filter(p => !p.isPurchased).map(p => `• ${p.name} - ${p.quantity} ${p.unit}`).join('\n')}`)}`)}
            >
              וואטסאפ
            </button>
          </div>
        </div>
      </>}

      {showEditList && editListData && <Modal title={list.isGroup ? 'עריכת קבוצה' : 'עריכת רשימה'} onClose={() => setShowEditList(false)}>
        <div style={S.formGroup}><label style={S.label}>שם</label><input style={S.input} value={editListData.name} onChange={e => setEditListData({ ...editListData, name: e.target.value })} /></div>
        <div style={S.formGroup}><label style={S.label}>אייקון</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{(list.isGroup ? GROUP_ICONS : LIST_ICONS).map(i => <button key={i} onClick={() => setEditListData({ ...editListData, icon: i })} style={{ width: '48px', height: '48px', borderRadius: '12px', border: editListData.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: editListData.icon === i ? '#F0FDFA' : '#fff', fontSize: '22px', cursor: 'pointer' }}>{i}</button>)}</div></div>
        <div style={S.formGroup}><label style={S.label}>צבע</label><div style={{ display: 'flex', gap: '10px' }}>{COLORS.map(c => <button key={c} onClick={() => setEditListData({ ...editListData, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: editListData.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />)}</div></div>
        <button style={S.primaryBtn} onClick={saveListChanges}>שמור שינויים</button>
        <button style={{ ...S.dangerBtnFull, marginTop: '12px' }} onClick={() => { setShowEditList(false); setConfirmDeleteList(true); }}>מחק {list.isGroup ? 'קבוצה' : 'רשימה'}</button>
      </Modal>}

      {confirmDeleteList && <ConfirmModal title={list.isGroup ? 'מחיקת קבוצה' : 'מחיקת רשימה'} message={`למחוק את "${list.name}"? פעולה זו לא ניתנת לביטול.`} confirmText="מחק" onConfirm={handleDeleteList} onCancel={() => setConfirmDeleteList(false)} />}

      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

function HomeScreen({ lists, onSelectList, onCreateList, onDeleteList, onEditList, onJoinGroup, onLogout, onUpdateUser, onMarkNotificationsRead, user }: HomeScreenProps) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editProfile, setEditProfile] = useState<{ name: string; email: string; avatarColor: string; avatarEmoji: string } | null>(null);
  const [editList, setEditList] = useState<List | null>(null);
  const [confirmDeleteList, setConfirmDeleteList] = useState<List | null>(null);
  const [newL, setNewL] = useState<{ name: string; icon: string; color: string }>({ name: '', icon: '📋', color: '#14B8A6' });
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');
  const [activeNav, setActiveNav] = useState<'home' | 'stats'>('home');

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
    if (!newL.name.trim()) {
      setCreateError('נא להזין שם לרשימה');
      return;
    }
    if (newL.name.length < 2) {
      setCreateError('השם חייב להכיל לפחות 2 תווים');
      return;
    }
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
    if (!joinCode.trim() || !joinPass.trim()) {
      setJoinError('נא למלא קוד וסיסמה');
      return;
    }
    const result = onJoinGroup(joinCode.trim().toUpperCase(), joinPass.trim());
    if (result.success) {
      setShowJoin(false);
      setJoinCode('');
      setJoinPass('');
    } else {
      setJoinError(result.error || 'שגיאה לא ידועה');
    }
  };

  const openOption = (option: string) => {
    setShowMenu(false);
    if (option === 'private') setShowCreate(true);
    if (option === 'group') setShowCreateGroup(true);
    if (option === 'join') setShowJoin(true);
  };

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <div style={S.headerRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ ...S.avatar, background: user.avatarColor || 'rgba(255,255,255,0.25)', cursor: 'pointer' }} onClick={() => setCurrentScreen('profile')}>{user.avatarEmoji || user.name.charAt(0)}</div>
            <div><div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>שלום,</div><div style={{ fontSize: '17px', fontWeight: '700', color: 'white' }}>{user.name}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={{ ...S.iconBtn, position: 'relative' }} onClick={() => setShowNotifications(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '18px', height: '18px', borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</div>}
            </button>
            <button style={S.iconBtn} onClick={() => setCurrentScreen('settings')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
        </div>
        <div style={S.searchBox}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" placeholder="חפש..." value={search} onChange={e => setSearch(e.target.value)} style={S.searchInput} /></div>
        <div style={S.tabs}>
          <button style={{ ...S.tab, ...(tab === 'all' ? S.tabActive : {}) }} onClick={() => setTab('all')}>הכל ({userLists.length})</button>
          <button style={{ ...S.tab, ...(tab === 'my' ? S.tabActive : {}) }} onClick={() => setTab('my')}>שלי ({my.length})</button>
          <button style={{ ...S.tab, ...(tab === 'groups' ? S.tabActive : {}) }} onClick={() => setTab('groups')}>קבוצות ({groups.length})</button>
        </div>
      </div>

      <div style={{ ...S.content, paddingBottom: '100px' }}>
        {display.length === 0 ? (
          <div style={{ ...S.empty, animation: 'fadeIn 0.5s ease' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '30px', background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '64px', boxShadow: '0 4px 12px rgba(20, 184, 166, 0.1)' }}>
              {tab === 'groups' ? '👥' : '📝'}
            </div>
            <p style={{ ...S.emptyText, marginBottom: '8px' }}>{tab === 'groups' ? 'טרם נוצרו קבוצות' : 'טרם נוצרו רשימות'}</p>
            <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '32px', maxWidth: '280px', margin: '0 auto 32px' }}>
              {tab === 'groups' ? 'התחל בקבוצה משותפת וצור רשימות קניות עם המשפחה והחברים' : 'התחל ביצירת רשימת קניות חדשה ועקוב בקלות אחר הצרכים שלך'}
            </p>
            <button
              style={{ padding: '14px 32px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
              onClick={() => { haptic('medium'); setShowMenu(true); }}
            >
              <span>✨</span>
              <span>{tab === 'groups' ? 'צור קבוצה ראשונה' : 'צור רשימה ראשונה'}</span>
            </button>
          </div>
        ) : display.map(l => {
          const count = l.products.filter(p => !p.isPurchased).length;
          const isOwner = l.owner.id === user.id;
          return (
            <div key={l.id} style={S.listCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }} onClick={() => onSelectList(l)}>
                <div style={{ ...S.listIcon, background: l.color }}>{l.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><span style={{ fontSize: '16px', fontWeight: '600' }}>{l.name}</span>{l.isGroup ? <span style={S.badge}>קבוצה</span> : <span style={{ ...S.badge, background: '#E0F2FE', color: '#0369A1' }}>פרטית</span>}</div>
                  <div style={{ fontSize: '13px', color: count > 0 ? '#F59E0B' : '#22C55E' }}>{count > 0 ? `${count} פריטים` : '✓ הושלם'}</div>
                </div>
              </div>
              {isOwner && <button style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setEditList(l); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>}
            </div>
          );
        })}
      </div>

      {showMenu && <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} onClick={() => setShowMenu(false)} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '24px 24px 0 0', padding: '20px', zIndex: 999, maxWidth: '430px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>מה תרצה ליצור?</h3>
            <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMenu(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button style={S.menuOption} onClick={() => openOption('private')}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#CCFBF1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>📝</div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1F2937' }}>רשימה פרטית</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>רשימת קניות אישית</div>
              </div>
            </button>
            <button style={S.menuOption} onClick={() => openOption('group')}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👥</div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1F2937' }}>קבוצה חדשה</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>שתף רשימה עם אחרים</div>
              </div>
            </button>
            <button style={S.menuOption} onClick={() => openOption('join')}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🔗</div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1F2937' }}>הצטרף לקבוצה</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>יש לך קוד הזמנה?</div>
              </div>
            </button>
          </div>
        </div>
      </>}

      {currentScreen === 'settings' && <div style={S.fullScreen}>
        <div style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', padding: '48px 20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={S.iconBtn} onClick={() => setCurrentScreen('home')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 style={{ flex: 1, color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>הגדרות</h1>
          </div>
        </div>
        <div style={S.scrollableContent}>
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={S.settingRow}>
              <span style={{ fontSize: '20px' }}>🔔</span>
              <span style={{ flex: 1 }}>התראות</span>
              <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: '#14B8A6', padding: '2px', cursor: 'pointer' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', marginRight: 'auto' }} />
              </div>
            </div>
            <div style={S.settingRow}>
              <span style={{ fontSize: '20px' }}>🌙</span>
              <span style={{ flex: 1 }}>מצב כהה</span>
              <div style={{ width: '44px', height: '26px', borderRadius: '13px', background: '#E5E7EB', padding: '2px', cursor: 'pointer' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white' }} />
              </div>
            </div>
            <div style={{ ...S.settingRow, borderBottom: 'none' }}>
              <span style={{ fontSize: '20px' }}>🌐</span>
              <span style={{ flex: 1 }}>שפה</span>
              <span style={{ color: '#6B7280', fontSize: '14px' }}>עברית</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: '16px' }}>
            <div style={S.settingRow}>
              <span style={{ fontSize: '20px' }}>❓</span>
              <span style={{ flex: 1 }}>עזרה ותמיכה</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{ ...S.settingRow, borderBottom: 'none' }}>
              <span style={{ fontSize: '20px' }}>ℹ️</span>
              <span style={{ flex: 1 }}>אודות</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: '16px' }}>
            <div style={{ ...S.settingRow, borderBottom: 'none', color: '#DC2626' }}>
              <span style={{ fontSize: '20px' }}>🗑️</span>
              <span style={{ flex: 1 }}>מחק את כל הנתונים</span>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '13px', marginTop: '32px', marginBottom: '80px' }}>SmartBasket גרסה 1.0.0</p>
        </div>

        <div style={S.bottomNav}>
          <div style={S.navItem} onClick={() => { setCurrentScreen('home'); setActiveNav('home'); }}>
            <span style={{ fontSize: '22px' }}>🏠</span>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>בית</span>
          </div>
          <div style={S.navItem} onClick={() => { setCurrentScreen('stats'); setActiveNav('stats'); }}>
            <span style={{ fontSize: '22px' }}>📊</span>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>סטטיסטיקה</span>
          </div>
          <div style={{ ...S.navItem, background: '#F0FDFA' }}>
            <span style={{ fontSize: '22px' }}>⚙️</span>
            <span style={{ fontSize: '11px', color: '#14B8A6', fontWeight: '600' }}>הגדרות</span>
          </div>
        </div>
      </div>}

      {currentScreen === 'profile' && <div style={S.fullScreen}>
        <div style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', padding: '48px 20px 40px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button style={S.iconBtn} onClick={() => { setCurrentScreen('home'); setEditProfile(null); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h1 style={{ flex: 1, color: 'white', fontSize: '20px', fontWeight: '700', margin: 0 }}>פרופיל</h1>
            {!editProfile && <button style={S.iconBtn} onClick={() => setEditProfile({ name: user.name, email: user.email, avatarColor: user.avatarColor || '#14B8A6', avatarEmoji: user.avatarEmoji || '' })}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>}
          </div>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: editProfile?.avatarColor || user.avatarColor || 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '4px solid rgba(255,255,255,0.3)', fontSize: '40px', color: 'white', fontWeight: '700' }}>
            {editProfile?.avatarEmoji || user.avatarEmoji || user.name.charAt(0)}
          </div>
          {!editProfile && <>
            <div style={{ color: 'white', fontSize: '22px', fontWeight: '700' }}>{user.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '4px' }}>{user.email}</div>
          </>}
        </div>

        <div style={{ ...S.scrollableContent, marginTop: '-20px' }}>
          {editProfile ? (
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={S.label}>צבע אווטר</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#0891B2'].map(c => (
                    <button key={c} onClick={() => setEditProfile({ ...editProfile, avatarColor: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: editProfile.avatarColor === c ? '3px solid #111' : '3px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={S.label}>אימוג׳י (אופציונלי)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['', '😊', '😎', '🦁', '🐻', '🦊', '🐸', '🌟', '⚡', '🔥'].map(e => (
                    <button key={e} onClick={() => setEditProfile({ ...editProfile, avatarEmoji: e })} style={{ width: '44px', height: '44px', borderRadius: '10px', border: editProfile.avatarEmoji === e ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: editProfile.avatarEmoji === e ? '#F0FDFA' : 'white', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {e || <span style={{ fontSize: '12px', color: '#9CA3AF' }}>ללא</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>שם</label>
                <input style={S.input} value={editProfile.name} onChange={e => setEditProfile({ ...editProfile, name: e.target.value })} />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>אימייל</label>
                <input style={S.input} value={editProfile.email} onChange={e => setEditProfile({ ...editProfile, email: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: '80px' }}>
                <button style={S.cancelBtn} onClick={() => setEditProfile(null)}>ביטול</button>
                <button style={{ ...S.primaryBtn, flex: 1 }} onClick={() => { onUpdateUser(editProfile); setEditProfile(null); }}>שמור שינויים</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <div style={S.settingRow}>
                  <span style={{ fontSize: '20px' }}>👤</span>
                  <span style={{ flex: 1 }}>שם</span>
                  <span style={{ color: '#6B7280', fontSize: '14px' }}>{user.name}</span>
                </div>
                <div style={{ ...S.settingRow, borderBottom: 'none' }}>
                  <span style={{ fontSize: '20px' }}>✉️</span>
                  <span style={{ flex: 1 }}>אימייל</span>
                  <span style={{ color: '#6B7280', fontSize: '14px' }}>{user.email}</span>
                </div>
              </div>

              <button style={{ width: '100%', padding: '16px', marginTop: '24px', marginBottom: '80px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} onClick={() => { setCurrentScreen('home'); setConfirmLogout(true); }}>התנתק</button>
            </>
          )}
        </div>

        <div style={S.bottomNav}>
          <div style={S.navItem} onClick={() => { setCurrentScreen('home'); setActiveNav('home'); }}>
            <span style={{ fontSize: '22px' }}>🏠</span>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>בית</span>
          </div>
          <div style={S.navItem} onClick={() => { setCurrentScreen('stats'); setActiveNav('stats'); }}>
            <span style={{ fontSize: '22px' }}>📊</span>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>סטטיסטיקה</span>
          </div>
          <div style={{ ...S.navItem, background: '#F0FDFA' }}>
            <span style={{ fontSize: '22px' }}>👤</span>
            <span style={{ fontSize: '11px', color: '#14B8A6', fontWeight: '600' }}>פרופיל</span>
          </div>
        </div>
      </div>}

      {currentScreen === 'stats' && (() => {
        const totalProducts = userLists.reduce((sum: number, l: List) => sum + l.products.length, 0);
        const completedProducts = userLists.reduce((sum: number, l: List) => sum + l.products.filter(p => p.isPurchased).length, 0);
        const pendingProducts = totalProducts - completedProducts;
        const completionRate = totalProducts > 0 ? Math.round((completedProducts / totalProducts) * 100) : 0;
        const myListsCount = my.length;
        const groupsCount = groups.length;
        const categoryCounts = userLists.flatMap((l: List) => l.products).reduce((acc: Record<string, number>, p: Product) => {
          acc[p.category] = (acc[p.category] || 0) + 1;
          return acc;
        }, {});
        const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
        const maxCategoryCount = sortedCategories[0]?.[1] || 1;
        const circumference = 2 * Math.PI * 54;
        const strokeDashoffset = circumference - (completionRate / 100) * circumference;

        return <div style={S.fullScreen}>
          <div style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', padding: '48px 20px 32px', flexShrink: 0 }}>
            <h1 style={{ color: 'white', fontSize: '20px', fontWeight: '700', margin: '0 0 24px', textAlign: 'center' }}>📊 סטטיסטיקות</h1>

            {totalProducts > 0 && <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', fontWeight: '800', color: 'white', lineHeight: 1, marginBottom: '8px' }}>{completionRate}%</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>שיעור השלמה</div>
              </div>
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke="white" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>{completedProducts}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>מתוך {totalProducts}</div>
                </div>
              </div>
            </div>}
          </div>

          <div style={S.scrollableContent}>
            {totalProducts === 0 ? (
              <div style={{ background: 'white', borderRadius: '20px', padding: '40px 20px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '40px' }}>📊</div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 12px', color: '#111827' }}>התחל למדוד!</h3>
                <p style={{ color: '#6B7280', fontSize: '15px', margin: 0, lineHeight: 1.5 }}>הוסף מוצרים לרשימות כדי לראות<br/>סטטיסטיקות מפורטות ומרתקות</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #14B8A6, #10B981)', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(20,184,166,0.25)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>📋</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{userLists.length}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>רשימות</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #10B981, #059669)', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.25)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>✓</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{completedProducts}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>נרכשו</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.25)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>⏳</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{pendingProducts}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>ממתינים</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: '0 4px 12px rgba(139,92,246,0.25)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>🛒</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{totalProducts}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>סה״כ</div>
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 20px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>📊</span>
                    פילוח רשימות
                  </h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)', borderRadius: '16px', textAlign: 'center', border: '2px solid #99F6E4' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📝</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#14B8A6', marginBottom: '6px' }}>{myListsCount}</div>
                      <div style={{ fontSize: '13px', color: '#0D9488', fontWeight: '600' }}>אישיות</div>
                    </div>
                    <div style={{ flex: 1, padding: '20px', background: 'linear-gradient(135deg, #F0FDFA, #CCFBF1)', borderRadius: '16px', textAlign: 'center', border: '2px solid #99F6E4' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
                      <div style={{ fontSize: '28px', fontWeight: '800', color: '#14B8A6', marginBottom: '6px' }}>{groupsCount}</div>
                      <div style={{ fontSize: '13px', color: '#0D9488', fontWeight: '600' }}>קבוצות</div>
                    </div>
                  </div>
                </div>

                {sortedCategories.length > 0 && <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '90px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 20px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🏆</span>
                    קטגוריות מובילות
                  </h3>
                  {sortedCategories.slice(0, 5).map(([category, count]) => {
                    const percentage = (count / maxCategoryCount) * 100;
                    return (
                      <div key={category} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{categoryIcons[category as ProductCategory]}</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{category}</span>
                          </div>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: '#14B8A6' }}>{count}</span>
                        </div>
                        <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'linear-gradient(90deg, #14B8A6, #10B981)', borderRadius: '4px', width: `${percentage}%`, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>}
              </>
            )}
          </div>
        
        <div style={S.bottomNav}>
          <div style={S.navItem} onClick={() => { setCurrentScreen('home'); setActiveNav('home'); }}>
            <span style={{ fontSize: '22px' }}>🏠</span>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>בית</span>
          </div>
          <div style={{ ...S.navItem, background: '#F0FDFA' }}>
            <span style={{ fontSize: '22px' }}>📊</span>
            <span style={{ fontSize: '11px', color: '#14B8A6', fontWeight: '600' }}>סטטיסטיקה</span>
          </div>
          <div style={S.navItem} onClick={() => setShowMenu(true)}>
            <span style={{ fontSize: '22px' }}>➕</span>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>חדש</span>
          </div>
        </div>
      </div>;
      })()}

      {showCreate && <Modal title="רשימה פרטית חדשה" onClose={() => { setShowCreate(false); setNewL({ name: '', icon: '📋', color: '#14B8A6' }); setCreateError(''); }}>
        {createError && <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', color: '#DC2626', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>⚠️ {createError}</div>}
        <div style={S.formGroup}><label style={S.label}>שם הרשימה</label><input style={S.input} value={newL.name} onChange={e => { setNewL({ ...newL, name: e.target.value }); setCreateError(''); }} placeholder="קניות שבועיות" /></div>
        <div style={S.formGroup}><label style={S.label}>אייקון</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{LIST_ICONS.map(i => <button key={i} onClick={() => setNewL({ ...newL, icon: i })} style={{ width: '48px', height: '48px', borderRadius: '12px', border: newL.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: newL.icon === i ? '#F0FDFA' : '#fff', fontSize: '22px', cursor: 'pointer' }}>{i}</button>)}</div></div>
        <div style={S.formGroup}><label style={S.label}>צבע</label><div style={{ display: 'flex', gap: '10px' }}>{COLORS.map(c => <button key={c} onClick={() => setNewL({ ...newL, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: newL.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />)}</div></div>
        <button style={S.primaryBtn} onClick={() => handleCreate(false)}>צור רשימה</button>
      </Modal>}

      {showCreateGroup && <Modal title="קבוצה חדשה" onClose={() => { setShowCreateGroup(false); setNewL({ name: '', icon: '👨‍👩‍👧‍👦', color: '#14B8A6' }); setCreateError(''); }}>
        {createError && <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', color: '#DC2626', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>⚠️ {createError}</div>}
        <div style={S.formGroup}><label style={S.label}>שם הקבוצה</label><input style={S.input} value={newL.name} onChange={e => { setNewL({ ...newL, name: e.target.value }); setCreateError(''); }} placeholder="קניות משפחתיות" /></div>
        <div style={S.formGroup}><label style={S.label}>אייקון</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{GROUP_ICONS.map(i => <button key={i} onClick={() => setNewL({ ...newL, icon: i })} style={{ width: '48px', height: '48px', borderRadius: '12px', border: newL.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: newL.icon === i ? '#F0FDFA' : '#fff', fontSize: '22px', cursor: 'pointer' }}>{i}</button>)}</div></div>
        <div style={S.formGroup}><label style={S.label}>צבע</label><div style={{ display: 'flex', gap: '10px' }}>{COLORS.map(c => <button key={c} onClick={() => setNewL({ ...newL, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: newL.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />)}</div></div>
        <button style={S.primaryBtn} onClick={() => handleCreate(true)}>צור קבוצה</button>
      </Modal>}

      {showJoin && <Modal title="הצטרף לקבוצה" onClose={() => { setShowJoin(false); setJoinError(''); setJoinCode(''); setJoinPass(''); }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>הזן את הקוד והסיסמה שקיבלת</p>
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>קוד קבוצה</label>
          <input style={{ ...S.input, textAlign: 'center', fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase' }} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="XXXXXX" maxLength={6} />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>סיסמה</label>
          <input style={{ ...S.input, textAlign: 'center', fontSize: '18px', letterSpacing: '2px' }} value={joinPass} onChange={e => setJoinPass(e.target.value)} placeholder="••••" maxLength={4} />
        </div>
        {joinError && <div style={S.errorBox}>{joinError}</div>}
        <button style={S.primaryBtn} onClick={handleJoin}>הצטרף לקבוצה</button>
      </Modal>}

      {editList && <Modal title={editList.isGroup ? 'עריכת קבוצה' : 'עריכת רשימה'} onClose={() => setEditList(null)}>
        <div style={S.formGroup}><label style={S.label}>שם</label><input style={S.input} value={editList.name} onChange={e => setEditList({ ...editList, name: e.target.value })} /></div>
        <div style={S.formGroup}><label style={S.label}>אייקון</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{(editList.isGroup ? GROUP_ICONS : LIST_ICONS).map(i => <button key={i} onClick={() => setEditList({ ...editList, icon: i })} style={{ width: '48px', height: '48px', borderRadius: '12px', border: editList.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: editList.icon === i ? '#F0FDFA' : '#fff', fontSize: '22px', cursor: 'pointer' }}>{i}</button>)}</div></div>
        <div style={S.formGroup}><label style={S.label}>צבע</label><div style={{ display: 'flex', gap: '10px' }}>{COLORS.map(c => <button key={c} onClick={() => setEditList({ ...editList, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: editList.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />)}</div></div>
        <button style={S.primaryBtn} onClick={() => { onEditList(editList); setEditList(null); }}>שמור שינויים</button>
        <button style={{ ...S.dangerBtnFull, marginTop: '12px' }} onClick={() => { setConfirmDeleteList(editList); setEditList(null); }}>מחק {editList.isGroup ? 'קבוצה' : 'רשימה'}</button>
      </Modal>}

      {confirmDeleteList && <ConfirmModal title={confirmDeleteList.isGroup ? 'מחיקת קבוצה' : 'מחיקת רשימה'} message={`למחוק את "${confirmDeleteList.name}"? פעולה זו לא ניתנת לביטול.`} confirmText="מחק" onConfirm={() => { onDeleteList(confirmDeleteList.id); setConfirmDeleteList(null); }} onCancel={() => setConfirmDeleteList(null)} />}

      {showNotifications && <Modal title="התראות" onClose={() => setShowNotifications(false)}>
        {myNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <span style={{ fontSize: '48px' }}>🔔</span>
            <p style={{ color: '#6B7280', fontSize: '15px', marginTop: '12px' }}>אין התראות חדשות</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myNotifications.map(n => {
              const isLeave = n.type === 'leave';
              return (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: isLeave ? '#FEF2F2' : '#F0FDF4', borderRadius: '12px', border: `1px solid ${isLeave ? '#FECACA' : '#BBF7D0'}` }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isLeave ? '#EF4444' : '#22C55E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{isLeave ? '👋' : '🎉'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: isLeave ? '#991B1B' : '#166534' }}>{n.userName} {isLeave ? 'עזב/ה את הקבוצה' : 'הצטרף/ה לקבוצה'}</div>
                    <div style={{ fontSize: '13px', color: isLeave ? '#B91C1C' : '#15803D' }}>{n.listName}</div>
                  </div>
                </div>
              );
            })}
            <button style={{ ...S.primaryBtn, marginTop: '8px' }} onClick={() => { 
              myNotifications.forEach(n => onMarkNotificationsRead(n.listId)); 
              setShowNotifications(false); 
            }}>סמן הכל כנקרא</button>
          </div>
        )}
      </Modal>}

      {confirmLogout && <ConfirmModal title="התנתקות" message="להתנתק?" confirmText="התנתק" onConfirm={() => { setConfirmLogout(false); onLogout(); }} onCancel={() => setConfirmLogout(false)} />}

      {currentScreen === 'home' && <div style={S.bottomNav}>
        <div style={{ ...S.navItem, ...(activeNav === 'home' ? { background: '#F0FDFA' } : {}) }} onClick={() => setActiveNav('home')}>
          <span style={{ fontSize: '22px' }}>🏠</span>
          <span style={{ fontSize: '11px', color: activeNav === 'home' ? '#14B8A6' : '#6B7280', fontWeight: activeNav === 'home' ? '600' : '400' }}>בית</span>
        </div>
        <div style={{ ...S.navItem, ...(activeNav === 'stats' ? { background: '#F0FDFA' } : {}) }} onClick={() => { setActiveNav('stats'); setCurrentScreen('stats'); }}>
          <span style={{ fontSize: '22px' }}>📊</span>
          <span style={{ fontSize: '11px', color: activeNav === 'stats' ? '#14B8A6' : '#6B7280', fontWeight: activeNav === 'stats' ? '600' : '400' }}>סטטיסטיקה</span>
        </div>
        <div style={S.navItem} onClick={() => setShowMenu(true)}>
          <span style={{ fontSize: '22px' }}>➕</span>
          <span style={{ fontSize: '11px', color: '#6B7280' }}>חדש</span>
        </div>
      </div>}
    </div>
  );
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Password strength
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, text: '', color: '' };
    if (pwd.length < 4) return { strength: 1, text: 'חלשה', color: '#EF4444' };
    if (pwd.length < 6) return { strength: 2, text: 'בינונית', color: '#F59E0B' };
    return { strength: 3, text: 'חזקה', color: '#10B981' };
  };

  const login = async () => {
    setError('');

    // Validation
    if (!email.trim()) { setError('נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError('אימייל לא תקין'); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }

    setLoading(true);
    haptic('light');

    // Simulate API delay for better UX
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
      const u = users.find((x: User) => x.email === email && x.password === password);

      if (u) {
        haptic('medium');
        onLogin(u);
      } else {
        haptic('heavy');
        setError('אימייל או סיסמה שגויים');
        setLoading(false);
      }
    }, 500);
  };

  const register = async () => {
    setError('');

    // Validation
    if (!name.trim()) { setError('נא להזין שם'); return; }
    if (name.trim().length < 2) { setError('שם חייב להכיל לפחות 2 תווים'); return; }
    if (!email.trim()) { setError('נא להזין אימייל'); return; }
    if (!isValidEmail(email)) { setError('אימייל לא תקין'); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }
    if (password.length < 4) { setError('סיסמה חייבת להכיל לפחות 4 תווים'); return; }
    if (!confirm) { setError('נא לאמת את הסיסמה'); return; }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return; }

    setLoading(true);
    haptic('light');

    // Simulate API delay
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('sb_users') || '[]');

      if (users.find((x: User) => x.email === email)) {
        haptic('heavy');
        setError('אימייל זה כבר קיים במערכת');
        setLoading(false);
        return;
      }

      const u = { id: `u${Date.now()}`, name: name.trim(), email, password };
      users.push(u);
      localStorage.setItem('sb_users', JSON.stringify(users));
      haptic('medium');
      onLogin(u);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (mode === 'login') login();
    else register();
  };

  const pwdStrength = mode === 'register' ? getPasswordStrength(password) : null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
      padding: '20px',
      fontFamily: '-apple-system, sans-serif',
      direction: 'rtl',
      overflowY: 'auto',
      position: 'fixed',
      width: '100%',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(20, 184, 166, 0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        padding: '40px 32px',
        margin: '20px auto',
        animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(20, 184, 166, 0.25)'
          }}>
            <span style={{ fontSize: '48px' }}>🛒</span>
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            margin: '0 0 8px',
            color: '#111827'
          }}>SmartBasket</h1>
          <p style={{
            color: '#6B7280',
            margin: 0,
            fontSize: '14px'
          }}>רשימות קניות חכמות ומשותפות</p>
        </div>

        {/* Tab Switch */}
        <div style={{
          display: 'flex',
          background: '#F3F4F6',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '28px'
        }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: mode === 'login' ? 'white' : 'transparent',
              color: mode === 'login' ? '#14B8A6' : '#6B7280',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
            onClick={() => { setMode('login'); setError(''); }}
          >
            התחברות
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: mode === 'register' ? 'white' : 'transparent',
              color: mode === 'register' ? '#14B8A6' : '#6B7280',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: mode === 'register' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
            }}
            onClick={() => { setMode('register'); setError(''); }}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name Field (Register only) */}
          {mode === 'register' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>שם מלא</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '20px',
                  opacity: 0.5
                }}>👤</span>
                <input
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 16px',
                    paddingRight: '48px',
                    borderRadius: '12px',
                    border: '2px solid #E5E7EB',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    background: loading ? '#F9FAFB' : 'white',
                    textAlign: 'right'
                  }}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="הזן את שמך המלא"
                  autoComplete="name"
                  required
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = '#14B8A6'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>אימייל</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '20px',
                opacity: 0.5
              }}>📧</span>
              <input
                type="email"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 16px',
                  paddingRight: '48px',
                  borderRadius: '12px',
                  border: '2px solid #E5E7EB',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  background: loading ? '#F9FAFB' : 'white',
                  textAlign: 'right'
                }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@mail.com"
                dir="ltr"
                autoComplete="email"
                required
                disabled={loading}
                onFocus={(e) => e.target.style.borderColor = '#14B8A6'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: mode === 'register' ? '20px' : '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>סיסמה</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '20px',
                opacity: 0.5
              }}>🔒</span>
              <input
                type="password"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 16px',
                  paddingRight: '48px',
                  borderRadius: '12px',
                  border: '2px solid #E5E7EB',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                  background: loading ? '#F9FAFB' : 'white',
                  textAlign: 'right'
                }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                disabled={loading}
                onFocus={(e) => e.target.style.borderColor = '#14B8A6'}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>
            {mode === 'register' && password && pwdStrength && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(pwdStrength.strength / 3) * 100}%`, height: '100%', background: pwdStrength.color, transition: 'all 0.3s ease' }} />
                </div>
                <span style={{ fontSize: '13px', color: pwdStrength.color, fontWeight: '600' }}>{pwdStrength.text}</span>
              </div>
            )}
          </div>

          {/* Confirm Password (Register only) */}
          {mode === 'register' && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>אימות סיסמה</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '20px',
                  opacity: 0.5
                }}>🔑</span>
                <input
                  type="password"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 16px',
                    paddingRight: '48px',
                    borderRadius: '12px',
                    border: '2px solid #E5E7EB',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    background: loading ? '#F9FAFB' : 'white',
                    textAlign: 'right'
                  }}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = '#14B8A6'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '14px 16px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '12px',
              color: '#DC2626',
              fontSize: '14px',
              marginBottom: '20px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #14B8A6, #10B981)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 24px rgba(20, 184, 166, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'pulse 1s ease infinite'
                }} />
                <span>טוען...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'התחבר' : 'הרשם'}</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function Toast({ msg, type = 'success' }: ToastProps) {
  if (!msg) return null;

  const config = toastConfig[type];
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '20px',
      background: config.bg,
      color: 'white',
      padding: '12px 16px',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: 9999,
      pointerEvents: 'none',
      boxShadow: `0 8px 24px ${config.shadow}`,
      animation: 'slideInLeft 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      maxWidth: 'calc(100vw - 40px)'
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{config.icon}</span>
      <span>{msg}</span>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sb_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [lists, setLists] = useState<List[]>(() => {
    const saved = localStorage.getItem('sb_lists');
    return saved ? JSON.parse(saved) : [];
  });
  const [selected, setSelected] = useState<List | null>(null);
  const [toast, setToast] = useState('');
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 1200); };

  useEffect(() => {
    localStorage.setItem('sb_lists', JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('sb_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sb_current_user');
    }
  }, [user]);

  const handleJoinGroup = (code: string, password: string) => {
    if (!user) return { success: false, error: 'משתמש לא מחובר' };
    const group = lists.find((l: List) => l.inviteCode === code && l.isGroup);
    if (!group) return { success: false, error: 'קבוצה לא נמצאה' };
    if (group.password !== password) return { success: false, error: 'סיסמה שגויה' };
    if (group.owner.id === user.id || group.members.some((m: Member) => m.id === user.id)) {
      return { success: false, error: 'אתה כבר בקבוצה' };
    }
    const updatedLists = lists.map((l: List) => l.id === group.id ? {
      ...l,
      members: [...l.members, { id: user.id, name: user.name, email: user.email }],
      notifications: [...(l.notifications || []), {
        id: `n${Date.now()}`,
        type: 'join' as const,
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
        read: false
      }]
    } : l);
    setLists(updatedLists);
    showToast('הצטרפת לקבוצה!');
    return { success: true };
  };

  const handleLeaveList = (listId: string) => {
    if (!user) return;
    setLists(lists.map((l: List) => l.id === listId ? {
      ...l,
      members: l.members.filter((m: Member) => m.id !== user.id),
      notifications: [...(l.notifications || []), {
        id: `n${Date.now()}`,
        type: 'leave' as const,
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
        read: false
      }]
    } : l));
    showToast('עזבת');
  };

  const markNotificationsRead = (listId: string) => {
    setLists(lists.map((l: List) => l.id === listId ? {
      ...l,
      notifications: (l.notifications || []).map((n: Notification) => ({ ...n, read: true }))
    } : l));
  };

  const handleUpdateUser = (updatedUser: Partial<User>) => {
    if (!user) return;
    const newUser = { ...user, ...updatedUser };
    setUser(newUser);
    const users = JSON.parse(localStorage.getItem('sb_users') || '[]');
    const updatedUsers = users.map((u: User) => u.id === newUser.id ? { ...u, ...updatedUser } : u);
    localStorage.setItem('sb_users', JSON.stringify(updatedUsers));
    showToast('הפרופיל עודכן');
  };

  if (!user) return <LoginScreen onLogin={setUser} />;
  return (
    <>
      {selected ? <ListScreen list={selected} user={user} onBack={() => setSelected(null)} onUpdateList={u => { setLists(lists.map(l => l.id === u.id ? u : l)); setSelected(u); }} onLeaveList={id => { handleLeaveList(id); setSelected(null); }} onDeleteList={id => { setLists(lists.filter(l => l.id !== id)); showToast('נמחק!'); }} showToast={showToast} /> : <HomeScreen lists={lists} user={user} onSelectList={setSelected} onCreateList={l => { setLists([...lists, l]); showToast('נוצר!'); }} onDeleteList={id => { setLists(lists.filter(l => l.id !== id)); showToast('נמחק!'); }} onEditList={l => { setLists(lists.map(x => x.id === l.id ? l : x)); showToast('נשמר!'); }} onJoinGroup={handleJoinGroup} onUpdateUser={handleUpdateUser} onMarkNotificationsRead={markNotificationsRead} onLogout={() => setUser(null)} />}
      <Toast msg={toast} />
    </>
  );
}

const S = {
  screen: { height: '100vh', display: 'flex', flexDirection: 'column' as const, background: '#F8FAFC', fontFamily: '-apple-system, sans-serif', direction: 'rtl' as const, maxWidth: '430px', margin: '0 auto', overflow: 'hidden', position: 'relative' as const },
  header: { background: 'linear-gradient(135deg, #14B8A6, #10B981)', padding: '48px 20px 20px', borderRadius: '0 0 24px 24px', flexShrink: 0, boxShadow: '0 4px 16px rgba(79, 70, 229, 0.15)' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title: { flex: 1, color: 'white', fontSize: '18px', fontWeight: '700', textAlign: 'center' as const, margin: 0 },
  iconBtn: { width: '44px', height: '44px', borderRadius: '14px', border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', backdropFilter: 'blur(10px)' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '18px' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px' },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: '15px', background: 'transparent', textAlign: 'right' as const },
  tabs: { display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '4px' },
  tab: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tabActive: { background: 'white', color: '#14B8A6' },
  content: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, padding: '16px', paddingBottom: '100px', WebkitOverflowScrolling: 'touch' as const, overscrollBehavior: 'contain' as const },
  empty: { textAlign: 'center' as const, padding: '48px 20px' },
  emptyText: { fontSize: '18px', fontWeight: '600', color: '#6B7280', margin: '12px 0 0' },
  listCard: { display: 'flex', alignItems: 'center', gap: '14px', background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #F1F5F9', transition: 'all 0.2s ease' },
  listIcon: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  badge: { background: '#CCFBF1', color: '#0D9488', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' },
  menuOption: { display: 'flex', alignItems: 'center', gap: '14px', background: '#F9FAFB', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer', width: '100%' },
  settingRow: { display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', borderBottom: '1px solid #F3F4F6', fontSize: '15px' },
  navItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer' },
  actionBtn: { width: '67px', height: '100%', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' },
  actionLabel: { fontSize: '11px', color: 'white', fontWeight: '600' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, overflow: 'hidden' },
  sheet: { background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '430px', maxHeight: '75vh', overflowY: 'auto' as const, overflowX: 'hidden' as const, padding: '12px 20px 32px', WebkitOverflowScrolling: 'touch' as const, overscrollBehavior: 'contain' as const, touchAction: 'pan-y' as const },
  handle: { width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 16px' },
  sheetTitle: { fontSize: '18px', fontWeight: '700', textAlign: 'center' as const, margin: '0 0 20px' },
  confirmBox: { background: 'white', borderRadius: '20px', padding: '24px', width: '90%', maxWidth: '320px', margin: 'auto' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' },
  input: { width: '100%', padding: '14px 16px', borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, textAlign: 'right' as const, transition: 'all 0.2s ease', minHeight: '52px' },
  primaryBtn: { width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #14B8A6, #10B981)', color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)', transition: 'all 0.2s ease', minHeight: '52px' },
  secondaryBtn: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#F3F4F6', color: '#374151', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px' },
  cancelBtn: { flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #E5E7EB', background: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px' },
  dangerBtn: { padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s ease', flex: 1, minHeight: '48px' },
  dangerBtnFull: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px' },
  loginScreen: { height: '100vh', overflowY: 'auto' as const, background: 'white', fontFamily: '-apple-system, sans-serif', direction: 'rtl' as const, maxWidth: '430px', margin: '0 auto', padding: '48px 24px 80px', boxSizing: 'border-box' as const, WebkitOverflowScrolling: 'touch' as const },
  tabSwitch: { display: 'flex', background: '#F3F4F6', borderRadius: '12px', padding: '4px', marginBottom: '24px' },
  tabSwitchBtn: { flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'transparent', color: '#6B7280', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
  tabSwitchActive: { background: 'white', color: '#14B8A6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  errorBox: { background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '10px', fontSize: '14px', textAlign: 'center' as const, marginBottom: '16px' },
  bottomNav: { position: 'fixed' as const, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '430px', background: 'white', display: 'flex', justifyContent: 'space-around', padding: '8px 0 max(24px, env(safe-area-inset-bottom))', borderTop: '1px solid #F3F4F6', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 10 },
  fullScreen: { position: 'fixed' as const, inset: 0, zIndex: 100, background: '#F8FAFC', height: '100vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', maxWidth: '430px', margin: '0 auto', left: '50%', transform: 'translateX(-50%)' },
  scrollableContent: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, WebkitOverflowScrolling: 'touch' as const, padding: '20px', paddingBottom: '40px', overscrollBehavior: 'contain' as const },
  fullScreenModal: { position: 'fixed' as const, inset: 0, zIndex: 100, background: 'white', height: '100vh', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', maxWidth: '430px', margin: '0 auto', left: '50%', transform: 'translateX(-50%)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F3F4F6', flexShrink: 0, minHeight: '64px', background: 'white' },
  closeBtn: { width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', transition: 'all 0.2s ease' },
  modalTitle: { fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0, flex: 1, textAlign: 'center' as const },
  modalContent: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, WebkitOverflowScrolling: 'touch' as const, padding: '20px', paddingBottom: '32px' },
};