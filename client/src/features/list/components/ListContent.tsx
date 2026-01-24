import { useState, useRef, useCallback } from 'react';
import type { Product, Member } from '../../../global/types';
import type { ListPageProps, ProductUnit, ProductCategory } from '../types/list-types';
import { S } from '../../../global/styles';
import { haptic, CATEGORY_ICONS, LIST_ICONS, GROUP_ICONS, LIST_COLORS, generateInviteMessage, generateShareListMessage } from '../../../global/helpers';
import { Modal, ConfirmModal, MemberAvatar, MembersButton } from '../../../global/components';
import { SwipeItem } from './SwipeItem';

export const ListContent = ({ list, onBack, onUpdateList, onLeaveList, onDeleteList, showToast, user }: ListPageProps) => {
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

  // Draggable FAB state
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
      <div style={{ ...S.header, background: 'linear-gradient(135deg, #14B8A6, #0D9488)' }}>
        <div style={S.headerRow}>
          <button style={S.iconBtn} onClick={onBack}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
          <h1 style={{ ...S.title, flex: 1, textAlign: 'center' }}>{list.name}</h1>
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

      <div style={{ ...S.content, overflowY: items.length === 0 ? 'hidden' : 'auto' }} onClick={() => setOpenItemId(null)}>
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
          <div style={S.empty}>
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
      </div>

      {(items.length > 0 || filter === 'purchased') && (
        <div
          style={{
            position: 'fixed',
            bottom: fabPosition ? undefined : '70px',
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
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: items.length > 5 ? '0' : '8px',
              padding: items.length > 5 ? '14px' : '12px 20px',
              width: items.length > 5 ? '52px' : 'auto',
              height: items.length > 5 ? '52px' : 'auto',
              borderRadius: '50px',
              border: 'none',
              background: 'linear-gradient(135deg, #14B8A6, #10B981)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '700',
              cursor: isDragging ? 'grabbing' : (items.length > 5 ? 'grab' : 'pointer'),
              boxShadow: '0 6px 20px rgba(20, 184, 166, 0.5)',
              transition: isDragging ? 'none' : 'all 0.2s ease'
            }}
            onClick={() => { if (!isDragging) { haptic('medium'); setShowAdd(true); } }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
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
        <div style={S.formGroup}><label style={S.label}>קטגוריה</label><select style={S.input} value={newP.category} onChange={e => setNewP({ ...newP, category: e.target.value as ProductCategory })}>{Object.keys(CATEGORY_ICONS).map(c => <option key={c}>{c}</option>)}</select></div>
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
            {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
              <button key={cat} onClick={() => setShowEdit({ ...showEdit, category: cat as ProductCategory })} style={{ padding: '8px 12px', borderRadius: '10px', border: showEdit.category === cat ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: showEdit.category === cat ? '#F0FDFA' : '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{icon}</span><span>{cat}</span>
              </button>
            ))}
          </div>
        </div>
        <button style={S.primaryBtn} onClick={() => { haptic('medium'); updateP(list.products.map((x: Product) => x.id === showEdit.id ? showEdit : x)); setShowEdit(null); showToast('נשמר'); }}>שמור</button>
      </Modal>}

      {showDetails && <Modal title="פרטים" onClose={() => setShowDetails(null)}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}><span style={{ fontSize: '56px' }}>{CATEGORY_ICONS[showDetails.category]}</span><h3 style={{ fontSize: '20px', fontWeight: '700', margin: '12px 0' }}>{showDetails.name}</h3></div>
        <div style={{ background: '#F9FAFB', borderRadius: '12px' }}>{([['כמות', `${showDetails.quantity} ${showDetails.unit}`], ['קטגוריה', showDetails.category], ['נוסף ע״י', showDetails.addedBy], ['תאריך', showDetails.createdDate || '-'], ['שעה', showDetails.createdTime || '-']] as [string, string][]).map(([l, v], i, a) => <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < a.length - 1 ? '1px solid #E5E7EB' : 'none' }}><span style={{ color: '#6B7280' }}>{l}</span><span style={{ fontWeight: '600' }}>{v}</span></div>)}</div>
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
                navigator.clipboard?.writeText(generateInviteMessage(list))
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
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateInviteMessage(list))}`)}
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
        {!isOwner && list.isGroup && <button style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px', marginTop: '20px' }} onClick={leaveList}>עזוב רשימה</button>}
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
              <span style={{ fontSize: '13px', color: '#14B8A6', fontWeight: '600' }}>{list.products.filter((p: Product) => !p.isPurchased).length} פריטים</span>
            </div>
            <div style={{ padding: '12px 16px', maxHeight: '140px', overflow: 'auto' }}>
              {list.products.filter((p: Product) => !p.isPurchased).length === 0 ? (
                <div style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', padding: '8px 0' }}>הרשימה ריקה</div>
              ) : (
                list.products.filter((p: Product) => !p.isPurchased).slice(0, 5).map((p: Product, i: number, arr: Product[]) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < arr.length - 1 ? '1px solid #CCFBF1' : 'none' }}>
                    <span style={{ fontSize: '14px', color: '#115E59' }}>• {p.name}</span>
                    <span style={{ fontSize: '13px', color: '#14B8A6' }}>{p.quantity} {p.unit}</span>
                  </div>
                ))
              )}
              {list.products.filter((p: Product) => !p.isPurchased).length > 5 && (
                <div style={{ fontSize: '13px', color: '#14B8A6', textAlign: 'center', paddingTop: '8px' }}>+ עוד {list.products.filter((p: Product) => !p.isPurchased).length - 5} פריטים</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #E5E7EB', background: 'white', fontSize: '14px', fontWeight: '700', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => {
                navigator.clipboard?.writeText(generateShareListMessage(list))
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
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateShareListMessage(list))}`)}
            >
              וואטסאפ
            </button>
          </div>
        </div>
      </>}

      {showEditList && editListData && <Modal title={list.isGroup ? 'עריכת קבוצה' : 'עריכת רשימה'} onClose={() => setShowEditList(false)}>
        <div style={S.formGroup}><label style={S.label}>שם</label><input style={S.input} value={editListData.name} onChange={e => setEditListData({ ...editListData, name: e.target.value })} /></div>
        <div style={S.formGroup}><label style={S.label}>אייקון</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{(list.isGroup ? GROUP_ICONS : LIST_ICONS).map(i => <button key={i} onClick={() => setEditListData({ ...editListData, icon: i })} style={{ width: '48px', height: '48px', borderRadius: '12px', border: editListData.icon === i ? '2px solid #14B8A6' : '1.5px solid #E5E7EB', background: editListData.icon === i ? '#F0FDFA' : '#fff', fontSize: '22px', cursor: 'pointer' }}>{i}</button>)}</div></div>
        <div style={S.formGroup}><label style={S.label}>צבע</label><div style={{ display: 'flex', gap: '10px' }}>{LIST_COLORS.map(c => <button key={c} onClick={() => setEditListData({ ...editListData, color: c })} style={{ width: '40px', height: '40px', borderRadius: '50%', background: c, border: editListData.color === c ? '3px solid #111' : 'none', cursor: 'pointer' }} />)}</div></div>
        <button style={S.primaryBtn} onClick={saveListChanges}>שמור שינויים</button>
        <button style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', minHeight: '48px', marginTop: '12px' }} onClick={() => { setShowEditList(false); setConfirmDeleteList(true); }}>מחק {list.isGroup ? 'קבוצה' : 'רשימה'}</button>
      </Modal>}

      {confirmDeleteList && <ConfirmModal title={list.isGroup ? 'מחיקת קבוצה' : 'מחיקת רשימה'} message={`למחוק את "${list.name}"? פעולה זו לא ניתנת לביטול.`} confirmText="מחק" onConfirm={handleDeleteList} onCancel={() => setConfirmDeleteList(false)} />}

      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
