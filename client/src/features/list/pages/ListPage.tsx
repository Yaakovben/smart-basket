import { useState, useRef } from 'react';
import type { List, Product, ProductUnit, ProductCategory, User, Member } from '../../../shared/types';
import { haptic, categoryIcons } from '../../../shared/helpers';
import { Modal, ConfirmModal } from '../../../shared/components';

interface ListPageProps {
  list: List;
  user: User;
  onBack: () => void;
  onUpdateList: (list: List) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  showToast: (message: string) => void;
}

const ACTIONS_WIDTH = 200;
const LIST_ICONS = ['📋', '📝', '✏️', '📌', '🗒️', '✅'];
const GROUP_ICONS = ['👨‍👩‍👧‍👦', '👥', '👫', '🏠', '💑', '👨‍👩‍👧'];
const COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
const memberColors = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4'];

function SwipeItem({ product, onToggle, onEdit, onDelete, onClick, isPurchased, isOpen, onOpen, onClose }: {
  product: Product;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  isPurchased: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOff = useRef(0);
  const icon = categoryIcons[product.category] || '📦';

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
    <div className="relative mb-2.5 rounded-xl h-[72px] overflow-hidden bg-gray-100">
      {offset > 0 && (
        <div className="absolute top-0 right-0 bottom-0 flex flex-row-reverse" style={{ width: ACTIONS_WIDTH }}>
          <button
            onClick={() => { haptic('medium'); doAction(onDelete); }}
            className="w-[67px] h-full flex flex-col items-center justify-center gap-1 cursor-pointer border-none bg-red-500"
            aria-label="מחק מוצר"
          >
            <span>🗑️</span>
            <span className="text-xs text-white font-semibold">מחק</span>
          </button>
          <button
            onClick={() => { haptic('light'); doAction(onEdit); }}
            className="w-[67px] h-full flex flex-col items-center justify-center gap-1 cursor-pointer border-none bg-teal-500"
            aria-label="ערוך מוצר"
          >
            <span>✏️</span>
            <span className="text-xs text-white font-semibold">ערוך</span>
          </button>
          <button
            onClick={() => { haptic('light'); doAction(onToggle); }}
            className={`w-[67px] h-full flex flex-col items-center justify-center gap-1 cursor-pointer border-none ${isPurchased ? 'bg-amber-500' : 'bg-green-500'}`}
            aria-label={isPurchased ? 'החזר לרשימה' : 'סמן כנקנה'}
          >
            <span>{isPurchased ? '↩️' : '✓'}</span>
            <span className="text-xs text-white font-semibold">{isPurchased ? 'החזר' : 'נקנה'}</span>
          </button>
        </div>
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
        className={`absolute inset-0 flex items-center gap-3 px-3.5 rounded-xl border border-gray-200 ${isPurchased ? 'bg-gray-50' : 'bg-white'}`}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
          boxShadow: offset > 0 ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${isPurchased ? 'bg-gray-100' : 'bg-amber-50'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className={`text-base font-semibold ${isPurchased ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {product.name}
          </div>
          <div className="text-sm text-gray-400">{product.quantity} {product.unit} • {product.addedBy}</div>
        </div>
        {isPurchased && <span className="text-xl">✅</span>}
      </div>
    </div>
  );
}

export function ListPage({ list, user, onBack, onUpdateList, onLeaveList, onDeleteList, showToast }: ListPageProps) {
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
    setConfirm({
      title: 'הסרת חבר',
      message: 'להסיר חבר זה מהרשימה?',
      onConfirm: () => {
        onUpdateList({ ...list, members: list.members.filter((m: Member) => m.id !== mid) });
        setConfirm(null);
        showToast('הוסר');
      }
    });
  };

  const leaveList = () => {
    setConfirm({
      title: 'עזיבת רשימה',
      message: 'לעזוב את הרשימה?',
      onConfirm: () => { onLeaveList(list.id); setConfirm(null); }
    });
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans max-w-[430px] mx-auto overflow-hidden relative" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-br from-teal-500 to-emerald-500 pt-12 pb-5 px-5 rounded-b-3xl flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => { haptic('light'); onBack(); }}
            className="w-11 h-11 rounded-xl border-none bg-white/20 cursor-pointer flex items-center justify-center backdrop-blur-sm"
            aria-label="חזור"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
          <h1 className="flex-1 text-white text-lg font-bold text-center">{list.name}</h1>
          <div className="flex gap-2">
            {isOwner && (
              <button
                onClick={() => { haptic('light'); handleEditList(); }}
                className="w-11 h-11 rounded-xl border-none bg-white/20 cursor-pointer flex items-center justify-center backdrop-blur-sm"
                aria-label="ערוך רשימה"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => { haptic('light'); setShowShareList(true); }}
              className="w-11 h-11 rounded-xl border-none bg-white/20 cursor-pointer flex items-center justify-center backdrop-blur-sm"
              aria-label="שתף רשימה"
            >
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
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => { haptic('light'); setShowMembers(true); }}
              className="flex items-center gap-2 bg-white/15 border-none rounded-full py-1.5 px-4 pr-2 cursor-pointer"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white"
                style={{ background: memberColors[0] }}
              >
                {allMembers[0]?.name?.charAt(0)}
              </div>
              <span className="text-white/90 text-sm font-semibold">{allMembers.length} חברים</span>
            </button>
            <button
              onClick={() => { haptic('light'); setShowInvite(true); }}
              className="w-9 h-9 rounded-full bg-white/20 border-none cursor-pointer flex items-center justify-center"
              aria-label="הזמן חברים"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="17" y1="11" x2="23" y2="11"/>
              </svg>
            </button>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-2.5 bg-white rounded-xl px-3.5 py-3 mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="חפש מוצר..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border-none outline-none text-base bg-transparent text-right"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white/15 rounded-lg p-1">
          <button
            onClick={() => { haptic('light'); setFilter('pending'); }}
            className={`flex-1 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-all ${
              filter === 'pending' ? 'bg-white text-teal-500' : 'bg-transparent text-white/90'
            }`}
          >
            לקנות ({pending.length})
          </button>
          <button
            onClick={() => { haptic('light'); setFilter('purchased'); }}
            className={`flex-1 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-all ${
              filter === 'purchased' ? 'bg-white text-teal-500' : 'bg-transparent text-white/90'
            }`}
          >
            נקנה ({purchased.length})
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24" onClick={() => setOpenItemId(null)}>
        {showHint && items.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl mb-3 border border-teal-200">
            <span className="text-2xl">💡</span>
            <div className="flex-1 text-sm text-teal-800">
              <strong>טיפ:</strong> גרור שמאלה לפעולות • לחץ לפרטים
            </div>
            <button onClick={dismissHint} className="bg-transparent border-none text-teal-500 text-xl cursor-pointer p-1">✕</button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center pt-12 animate-fadeIn">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 text-6xl ${
              filter === 'pending' ? 'bg-gradient-to-br from-teal-50 to-teal-100' : 'bg-gray-100'
            }`}>
              {filter === 'pending' ? '🎉' : '📦'}
            </div>
            <p className="text-lg font-semibold text-gray-500 mb-2">
              {filter === 'pending' ? 'כל הכבוד!' : 'אין מוצרים'}
            </p>
            <p className="text-sm text-gray-400 mb-6">
              {filter === 'pending' ? 'כל המוצרים נקנו בהצלחה' : 'הוסף מוצרים חדשים לרשימה'}
            </p>
            {filter === 'pending' && (
              <button
                onClick={() => { haptic('light'); setShowAdd(true); }}
                className="py-3.5 px-6 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30 flex items-center gap-2 mx-auto"
              >
                <span>➕</span>
                <span>הוסף מוצר</span>
              </button>
            )}
          </div>
        ) : (
          items.map((p) => (
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
          ))
        )}
      </main>

      {/* FAB */}
      {(items.length > 0 || filter === 'purchased') && (
        <button
          onClick={() => { haptic('medium'); setShowAdd(true); }}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white cursor-pointer shadow-xl shadow-teal-500/40 flex items-center justify-center z-5 ${
            items.length > 5 ? 'w-14 h-14' : 'py-3.5 px-6 gap-2'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {items.length <= 5 && <span className="text-base font-bold">הוסף מוצר</span>}
        </button>
      )}

      {/* Add Product Modal */}
      {showAdd && (
        <Modal title="מוצר חדש" onClose={() => { setShowAdd(false); setAddError(''); }}>
          {addError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-600 text-sm mb-4 text-center">
              ⚠️ {addError}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם</label>
            <input
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none text-right"
              value={newP.name}
              onChange={(e) => { setNewP({ ...newP, name: e.target.value }); setAddError(''); }}
              placeholder="חלב תנובה"
            />
          </div>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">כמות</label>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden h-[52px]">
                <button
                  onClick={() => setNewP({ ...newP, quantity: Math.max(1, newP.quantity - 1) })}
                  className="w-[52px] border-none bg-gray-50 text-2xl cursor-pointer"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  className="flex-1 border-none text-center text-xl font-semibold outline-none w-[50px]"
                  value={newP.quantity}
                  onChange={(e) => setNewP({ ...newP, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                <button
                  onClick={() => setNewP({ ...newP, quantity: newP.quantity + 1 })}
                  className="w-[52px] border-none bg-gray-50 text-2xl cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">יחידה</label>
              <select
                className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none h-[52px]"
                value={newP.unit}
                onChange={(e) => setNewP({ ...newP, unit: e.target.value as ProductUnit })}
              >
                <option>יח׳</option>
                <option>ק״ג</option>
                <option>גרם</option>
                <option>ליטר</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">קטגוריה</label>
            <select
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none"
              value={newP.category}
              onChange={(e) => setNewP({ ...newP, category: e.target.value as ProductCategory })}
            >
              {Object.keys(categoryIcons).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { haptic('medium'); handleAdd(); }}
            className="w-full py-4 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
          >
            הוסף
          </button>
        </Modal>
      )}

      {/* Edit Product Modal */}
      {showEdit && (
        <Modal title="ערוך מוצר" onClose={() => setShowEdit(null)}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם</label>
            <input
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none text-right"
              value={showEdit.name}
              onChange={(e) => setShowEdit({ ...showEdit, name: e.target.value })}
            />
          </div>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">כמות</label>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden h-[52px]">
                <button
                  onClick={() => setShowEdit({ ...showEdit, quantity: Math.max(1, showEdit.quantity - 1) })}
                  className="w-[52px] border-none bg-gray-50 text-2xl cursor-pointer"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  className="flex-1 border-none text-center text-xl font-semibold outline-none w-[50px]"
                  value={showEdit.quantity}
                  onChange={(e) => setShowEdit({ ...showEdit, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                <button
                  onClick={() => setShowEdit({ ...showEdit, quantity: showEdit.quantity + 1 })}
                  className="w-[52px] border-none bg-gray-50 text-2xl cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">יחידה</label>
              <select
                className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none h-[52px]"
                value={showEdit.unit}
                onChange={(e) => setShowEdit({ ...showEdit, unit: e.target.value as ProductUnit })}
              >
                <option>יח׳</option>
                <option>ק״ג</option>
                <option>גרם</option>
                <option>ליטר</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">קטגוריה</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(categoryIcons).map(([cat, icon]) => (
                <button
                  key={cat}
                  onClick={() => setShowEdit({ ...showEdit, category: cat as ProductCategory })}
                  className={`py-2 px-3 rounded-lg text-sm cursor-pointer flex items-center gap-1.5 ${
                    showEdit.category === cat ? 'border-2 border-teal-500 bg-teal-50' : 'border border-gray-200 bg-white'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              haptic('medium');
              updateP(list.products.map(x => x.id === showEdit.id ? showEdit : x));
              setShowEdit(null);
              showToast('נשמר');
            }}
            className="w-full py-4 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
          >
            שמור
          </button>
        </Modal>
      )}

      {/* Product Details Modal */}
      {showDetails && (
        <Modal title="פרטים" onClose={() => setShowDetails(null)}>
          <div className="text-center mb-5">
            <span className="text-6xl">{categoryIcons[showDetails.category]}</span>
            <h3 className="text-xl font-bold mt-3">{showDetails.name}</h3>
          </div>
          <div className="bg-gray-50 rounded-xl">
            {[
              ['כמות', `${showDetails.quantity} ${showDetails.unit}`],
              ['קטגוריה', showDetails.category],
              ['נוסף ע״י', showDetails.addedBy],
              ['תאריך', showDetails.createdDate || '-'],
              ['שעה', showDetails.createdTime || '-']
            ].map(([l, v], i, a) => (
              <div key={l} className={`flex justify-between p-3 ${i < a.length - 1 ? 'border-b border-gray-200' : ''}`}>
                <span className="text-gray-500">{l}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowInvite(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 z-[1001] w-[90%] max-w-[340px] shadow-2xl animate-scaleIn">
            <button
              onClick={() => setShowInvite(false)}
              className="absolute top-3 left-3 w-8 h-8 rounded-full border-none bg-gray-100 cursor-pointer flex items-center justify-center"
              aria-label="סגור"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <path d="M20 8v6"/>
                  <path d="M23 11h-6"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">הזמן חברים</h3>
              <p className="text-gray-500 text-sm">שתף את הפרטים להצטרפות לקבוצה</p>
            </div>
            <div className="bg-teal-50 rounded-xl border-2 border-teal-200 mb-5 overflow-hidden">
              <div className="flex items-center justify-between p-3.5 border-b border-teal-200">
                <span className="text-teal-800 text-sm font-semibold">קוד קבוצה</span>
                <span className="text-xl font-extrabold text-teal-800 tracking-widest font-mono">{list.inviteCode}</span>
              </div>
              <div className="flex items-center justify-between p-3.5">
                <span className="text-teal-800 text-sm font-semibold">סיסמה</span>
                <span className="text-xl font-extrabold text-teal-800 tracking-widest font-mono">{list.password}</span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`הצטרף לקבוצה "${list.name}"!\n\nקוד: ${list.inviteCode}\nסיסמה: ${list.password}`)
                  .then(() => { showToast('הועתק!'); setShowInvite(false); })
                  .catch(() => showToast('שגיאה בהעתקה'));
              }}
              className="w-full py-3.5 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
            >
              העתק פרטי הזמנה
            </button>
          </div>
        </>
      )}

      {/* Members Modal */}
      {showMembers && (
        <Modal title="חברי הקבוצה" onClose={() => setShowMembers(false)}>
          {allMembers.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm"
                style={{ background: memberColors[i % memberColors.length] }}
              >
                {m.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{m.name}</div>
                <div className="text-sm text-gray-500">{m.email}</div>
              </div>
              {m.id === list.owner.id ? (
                <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs font-semibold">מנהל</span>
              ) : isOwner ? (
                <button
                  onClick={() => removeMember(m.id)}
                  className="text-red-500 text-sm font-semibold bg-transparent border-none cursor-pointer"
                >
                  הסר
                </button>
              ) : null}
            </div>
          ))}
          {!isOwner && (
            <button
              onClick={leaveList}
              className="w-full py-3.5 rounded-xl border-none bg-red-50 text-red-600 text-base font-semibold cursor-pointer mt-4"
            >
              עזוב קבוצה
            </button>
          )}
        </Modal>
      )}

      {/* Share List Modal */}
      {showShareList && (
        <Modal title="שתף רשימה" onClose={() => setShowShareList(false)}>
          <div className="text-center py-4">
            <div className="text-5xl mb-4">📤</div>
            <p className="text-gray-500 mb-4">שתף את תוכן הרשימה</p>
            <button
              onClick={() => {
                const text = `רשימת קניות - ${list.name}\n\n${list.products.filter(p => !p.isPurchased).map(p => `• ${p.name} (${p.quantity} ${p.unit})`).join('\n')}`;
                navigator.clipboard?.writeText(text)
                  .then(() => { showToast('הועתק!'); setShowShareList(false); })
                  .catch(() => showToast('שגיאה בהעתקה'));
              }}
              className="w-full py-3.5 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
            >
              העתק רשימה
            </button>
          </div>
        </Modal>
      )}

      {/* Edit List Modal */}
      {showEditList && editListData && (
        <Modal title="עריכת רשימה" onClose={() => setShowEditList(false)}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם</label>
            <input
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none text-right"
              value={editListData.name}
              onChange={(e) => setEditListData({ ...editListData, name: e.target.value })}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">אייקון</label>
            <div className="flex gap-2 flex-wrap">
              {(list.isGroup ? GROUP_ICONS : LIST_ICONS).map((i) => (
                <button
                  key={i}
                  onClick={() => setEditListData({ ...editListData, icon: i })}
                  className={`w-12 h-12 rounded-xl text-xl cursor-pointer ${
                    editListData.icon === i ? 'border-2 border-teal-500 bg-teal-50' : 'border border-gray-200 bg-white'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">צבע</label>
            <div className="flex gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setEditListData({ ...editListData, color: c })}
                  className="w-10 h-10 rounded-full cursor-pointer"
                  style={{ background: c, border: editListData.color === c ? '3px solid #111' : 'none' }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => { haptic('medium'); saveListChanges(); }}
            className="w-full py-4 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
          >
            שמור שינויים
          </button>
          <button
            onClick={() => { setShowEditList(false); setConfirmDeleteList(true); }}
            className="w-full py-3.5 rounded-xl border-none bg-red-50 text-red-600 text-base font-semibold cursor-pointer mt-3"
          >
            מחק רשימה
          </button>
        </Modal>
      )}

      {/* Confirm Delete List */}
      {confirmDeleteList && (
        <ConfirmModal
          title="מחיקת רשימה"
          message={`למחוק את "${list.name}"? פעולה זו לא ניתנת לביטול.`}
          confirmText="מחק"
          onConfirm={handleDeleteList}
          onCancel={() => setConfirmDeleteList(false)}
        />
      )}

      {/* Generic Confirm Modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
