import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { List, Member, Notification, Product } from '../../../global/types';
import type { HomeScreenProps } from '../types';
import { S } from '../../../global/styles';
import { haptic, LIST_ICONS, GROUP_ICONS, LIST_COLORS, MENU_OPTIONS } from '../../../global/helpers';
import { Modal, ConfirmModal } from '../../../global/components';

export function HomeScreen({ lists, onSelectList, onCreateList, onDeleteList, onEditList, onJoinGroup, onLogout, onMarkNotificationsRead, user }: HomeScreenProps) {
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
            <div style={{ ...S.avatar, background: user.avatarColor || 'rgba(255,255,255,0.25)', cursor: 'pointer' }} onClick={() => navigate('/profile')}>{user.avatarEmoji || user.name.charAt(0)}</div>
            <div><div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>שלום,</div><div style={{ fontSize: '17px', fontWeight: '700', color: 'white' }}>{user.name}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button style={{ ...S.iconBtn, position: 'relative' }} onClick={() => setShowNotifications(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '18px', height: '18px', borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount}</div>}
            </button>
            <button style={S.iconBtn} onClick={() => navigate('/settings')}>
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

      <div style={{ ...S.content, paddingBottom: '100px', overflowY: display.length === 0 ? 'hidden' : 'auto' }}>
        {display.length === 0 ? (
          <div style={S.empty}>
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
        ) : display.map((l: List) => {
          const count = l.products.filter((p: Product) => !p.isPurchased).length;
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>}
            </div>
          );
        })}
      </div>

      {showMenu && <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998, backdropFilter: 'blur(2px)' }} onClick={() => setShowMenu(false)} />
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '20px 20px 0 0', padding: '12px 20px 28px', zIndex: 999, maxWidth: '430px', margin: '0 auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '36px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', margin: 0, color: '#111827' }}>מה תרצה ליצור?</h3>
            <button style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMenu(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {MENU_OPTIONS.map((option) => (
              <button key={option.id} style={{ ...S.menuOption, padding: '12px 14px', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} onClick={() => openOption(option.id)}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: option.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{option.icon}</div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#1F2937', marginBottom: '2px' }}>{option.title}</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{option.description}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        </div>
      </>}

      {showCreate && <Modal title="רשימה פרטית חדשה" onClose={() => { setShowCreate(false); setNewL({ name: '', icon: '📋', color: '#14B8A6' }); setCreateError(''); }}>
        {createError && <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', color: '#DC2626', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>⚠️ {createError}</div>}
        <div style={S.formGroup}><label style={S.label}>שם הרשימה</label><input style={S.input} value={newL.name} onChange={e => { setNewL({ ...newL, name: e.target.value }); setCreateError(''); }} placeholder="קניות שבועיות" /></div>
        <div style={S.formGroup}><label style={S.label}>אייקון</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{LIST_ICONS.map(i => <button key={i} onClick={() => setNewL({ ...newL, icon: i })} style={{ width: '48px', height: '48px', borderRadius: '12px', border: newL.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: newL.icon === i ? '#F0FDFA' : '#fff', fontSize: '22px', cursor: 'pointer' }}>{i}</button>)}</div></div>
        <div style={S.formGroup}><label style={S.label}>צבע</label><div style={{ display: 'flex', gap: '10px' }}>{LIST_COLORS.map(c => <button key={c} onClick={() => setNewL({ ...newL, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: newL.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />)}</div></div>
        <button style={S.primaryBtn} onClick={() => handleCreate(false)}>צור רשימה</button>
      </Modal>}

      {showCreateGroup && <Modal title="קבוצה חדשה" onClose={() => { setShowCreateGroup(false); setNewL({ name: '', icon: '👨‍👩‍👧‍👦', color: '#14B8A6' }); setCreateError(''); }}>
        {createError && <div style={{ padding: '12px 16px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', color: '#DC2626', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>⚠️ {createError}</div>}
        <div style={S.formGroup}><label style={S.label}>שם הקבוצה</label><input style={S.input} value={newL.name} onChange={e => { setNewL({ ...newL, name: e.target.value }); setCreateError(''); }} placeholder="קניות משפחתיות" /></div>
        <div style={S.formGroup}><label style={S.label}>אייקון</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{GROUP_ICONS.map(i => <button key={i} onClick={() => setNewL({ ...newL, icon: i })} style={{ width: '48px', height: '48px', borderRadius: '12px', border: newL.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: newL.icon === i ? '#F0FDFA' : '#fff', fontSize: '22px', cursor: 'pointer' }}>{i}</button>)}</div></div>
        <div style={S.formGroup}><label style={S.label}>צבע</label><div style={{ display: 'flex', gap: '10px' }}>{LIST_COLORS.map(c => <button key={c} onClick={() => setNewL({ ...newL, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: newL.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />)}</div></div>
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
        {joinError && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '12px', borderRadius: '10px', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>{joinError}</div>}
        <button style={S.primaryBtn} onClick={handleJoin}>הצטרף לקבוצה</button>
      </Modal>}

      {editList && <Modal title={editList.isGroup ? 'עריכת קבוצה' : 'עריכת רשימה'} onClose={() => setEditList(null)}>
        <div style={S.formGroup}><label style={S.label}>שם</label><input style={S.input} value={editList.name} onChange={e => setEditList({ ...editList, name: e.target.value })} /></div>
        <div style={S.formGroup}><label style={S.label}>אייקון</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{(editList.isGroup ? GROUP_ICONS : LIST_ICONS).map(i => <button key={i} onClick={() => setEditList({ ...editList, icon: i })} style={{ width: '48px', height: '48px', borderRadius: '12px', border: editList.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: editList.icon === i ? '#F0FDFA' : '#fff', fontSize: '22px', cursor: 'pointer' }}>{i}</button>)}</div></div>
        <div style={S.formGroup}><label style={S.label}>צבע</label><div style={{ display: 'flex', gap: '10px' }}>{LIST_COLORS.map(c => <button key={c} onClick={() => setEditList({ ...editList, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: editList.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />)}</div></div>
        <button style={S.primaryBtn} onClick={() => { onEditList(editList); setEditList(null); }}>שמור שינויים</button>
        <button style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px', marginTop: '12px' }} onClick={() => { setConfirmDeleteList(editList); setEditList(null); }}>מחק {editList.isGroup ? 'קבוצה' : 'רשימה'}</button>
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
            {myNotifications.map((n: Notification & { listName: string; listId: string }) => {
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
              myNotifications.forEach((n: Notification & { listName: string; listId: string }) => onMarkNotificationsRead(n.listId));
              setShowNotifications(false);
            }}>סמן הכל כנקרא</button>
          </div>
        )}
      </Modal>}

      {confirmLogout && <ConfirmModal title="התנתקות" message="להתנתק?" confirmText="התנתק" onConfirm={() => { setConfirmLogout(false); onLogout(); }} onCancel={() => setConfirmLogout(false)} />}

      <div style={S.bottomNav}>
        <div style={{ ...S.navItem, background: '#F0FDFA' }}>
          <span style={{ fontSize: '22px' }}>🏠</span>
          <span style={{ fontSize: '11px', color: '#14B8A6', fontWeight: '600' }}>בית</span>
        </div>
        <div style={S.navItem} onClick={() => setShowMenu(true)}>
          <span style={{ fontSize: '22px' }}>➕</span>
          <span style={{ fontSize: '11px', color: '#6B7280' }}>חדש</span>
        </div>
      </div>
    </div>
  );
}
