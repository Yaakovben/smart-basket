import { useState } from 'react';
import type { User, List, Member, Notification } from '../../../shared/types';
import { haptic } from '../../../shared/helpers';
import { Modal } from '../../../shared/components';

interface HomePageProps {
  lists: List[];
  user: User;
  onSelectList: (list: List) => void;
  onCreateList: (list: List) => void;
  onDeleteList: (listId: string) => void;
  onEditList: (list: List) => void;
  onJoinGroup: (code: string, password: string) => { success: boolean; error?: string };
  onMarkNotificationsRead: (listId: string) => void;
  onNavigate: (screen: 'profile' | 'settings' | 'stats') => void;
  showToast: (message: string) => void;
}

const LIST_ICONS = ['📋', '📝', '✏️', '📌', '🗒️', '✅'];
const GROUP_ICONS = ['👨‍👩‍👧‍👦', '👥', '👫', '🏠', '💑', '👨‍👩‍👧'];
const COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];

export function HomePage({
  lists,
  user,
  onSelectList,
  onCreateList,
  onDeleteList,
  onEditList,
  onJoinGroup,
  onMarkNotificationsRead,
  onNavigate,
  showToast
}: HomePageProps) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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
    showToast('נוצר בהצלחה');
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
      showToast('הצטרפת בהצלחה');
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
    <div className="h-screen flex flex-col bg-slate-50 font-sans max-w-[430px] mx-auto overflow-hidden relative" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-br from-teal-500 to-emerald-500 pt-12 pb-5 px-5 rounded-b-3xl flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { haptic('light'); onNavigate('profile'); }}
              className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg border-none cursor-pointer"
              style={{ background: user.avatarColor || 'rgba(255,255,255,0.25)' }}
              aria-label="פתח פרופיל"
            >
              {user.avatarEmoji || user.name.charAt(0)}
            </button>
            <div>
              <div className="text-sm text-white/80">שלום,</div>
              <div className="text-lg font-bold text-white">{user.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { haptic('light'); setShowNotifications(true); }}
              className="w-11 h-11 rounded-xl border-none bg-white/20 cursor-pointer flex items-center justify-center backdrop-blur-sm relative"
              aria-label="התראות"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount}
                </div>
              )}
            </button>
            <button
              onClick={() => { haptic('light'); onNavigate('settings'); }}
              className="w-11 h-11 rounded-xl border-none bg-white/20 cursor-pointer flex items-center justify-center backdrop-blur-sm"
              aria-label="הגדרות"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 bg-white rounded-xl px-3.5 py-3 mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="חפש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border-none outline-none text-base bg-transparent text-right"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-white/15 rounded-lg p-1">
          {[
            { id: 'all', label: `הכל (${userLists.length})` },
            { id: 'my', label: `שלי (${my.length})` },
            { id: 'groups', label: `קבוצות (${groups.length})` }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { haptic('light'); setTab(t.id); }}
              className={`flex-1 py-2.5 rounded-lg border-none text-sm font-semibold cursor-pointer transition-all ${
                tab === t.id ? 'bg-white text-teal-500' : 'bg-transparent text-white/90'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24">
        {display.length === 0 ? (
          <div className="text-center pt-12 animate-fadeIn">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-6 text-6xl shadow-sm">
              {tab === 'groups' ? '👥' : '📝'}
            </div>
            <p className="text-lg font-semibold text-gray-500 mb-2">
              {tab === 'groups' ? 'טרם נוצרו קבוצות' : 'טרם נוצרו רשימות'}
            </p>
            <p className="text-sm text-gray-400 mb-8 max-w-[280px] mx-auto">
              {tab === 'groups'
                ? 'התחל בקבוצה משותפת וצור רשימות קניות עם המשפחה והחברים'
                : 'התחל ביצירת רשימת קניות חדשה ועקוב בקלות אחר הצרכים שלך'}
            </p>
            <button
              onClick={() => { haptic('medium'); setShowMenu(true); }}
              className="py-3.5 px-8 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30 flex items-center gap-2 mx-auto"
            >
              <span>✨</span>
              <span>{tab === 'groups' ? 'צור קבוצה ראשונה' : 'צור רשימה ראשונה'}</span>
            </button>
          </div>
        ) : (
          display.map((l) => {
            const count = l.products.filter((p) => !p.isPurchased).length;
            const isOwner = l.owner.id === user.id;
            return (
              <div
                key={l.id}
                className="flex items-center gap-3.5 bg-white p-4 rounded-2xl mb-3 cursor-pointer shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div
                  className="flex items-center gap-3.5 flex-1"
                  onClick={() => { haptic('light'); onSelectList(l); }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: l.color }}
                  >
                    {l.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold">{l.name}</span>
                      {l.isGroup ? (
                        <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-md text-xs font-semibold">קבוצה</span>
                      ) : (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-xs font-semibold">פרטית</span>
                      )}
                    </div>
                    <div className={`text-sm ${count > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                      {count > 0 ? `${count} פריטים` : '✓ הושלם'}
                    </div>
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={(e) => { e.stopPropagation(); haptic('light'); setEditList(l); }}
                    className="p-2 rounded-lg border-none bg-transparent cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="12" cy="5" r="1"/>
                      <circle cx="12" cy="19" r="1"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* FAB */}
      {display.length > 0 && (
        <button
          onClick={() => { haptic('medium'); setShowMenu(true); }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white cursor-pointer shadow-xl shadow-teal-500/40 flex items-center justify-center z-5"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white flex justify-around py-2 safe-area-bottom border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
        <button
          onClick={() => { haptic('light'); onNavigate('settings'); }}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border-none bg-transparent cursor-pointer text-gray-400"
        >
          <span className="text-2xl">⚙️</span>
          <span className="text-xs font-semibold">הגדרות</span>
        </button>
        <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border-none bg-teal-50 cursor-pointer text-teal-500">
          <span className="text-2xl">🏠</span>
          <span className="text-xs font-semibold">בית</span>
        </button>
        <button
          onClick={() => { haptic('light'); onNavigate('profile'); }}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl border-none bg-transparent cursor-pointer text-gray-400"
        >
          <span className="text-2xl">👤</span>
          <span className="text-xs font-semibold">פרופיל</span>
        </button>
      </nav>

      {/* Menu Modal */}
      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[998]" onClick={() => setShowMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 z-[999] max-w-[430px] mx-auto animate-slideUp">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">מה תרצה ליצור?</h3>
              <button
                onClick={() => setShowMenu(false)}
                className="w-8 h-8 rounded-full border-none bg-gray-100 cursor-pointer flex items-center justify-center"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => openOption('private')}
                className="flex items-center gap-3.5 bg-gray-50 p-3.5 rounded-xl border-none cursor-pointer w-full"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center text-xl">📝</div>
                <div className="flex-1 text-right">
                  <div className="text-base font-semibold text-gray-800">רשימה פרטית</div>
                  <div className="text-sm text-gray-500">רשימת קניות אישית</div>
                </div>
              </button>
              <button
                onClick={() => openOption('group')}
                className="flex items-center gap-3.5 bg-gray-50 p-3.5 rounded-xl border-none cursor-pointer w-full"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-xl">👥</div>
                <div className="flex-1 text-right">
                  <div className="text-base font-semibold text-gray-800">קבוצה חדשה</div>
                  <div className="text-sm text-gray-500">שתף רשימה עם אחרים</div>
                </div>
              </button>
              <button
                onClick={() => openOption('join')}
                className="flex items-center gap-3.5 bg-gray-50 p-3.5 rounded-xl border-none cursor-pointer w-full"
              >
                <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-xl">🔗</div>
                <div className="flex-1 text-right">
                  <div className="text-base font-semibold text-gray-800">הצטרף לקבוצה</div>
                  <div className="text-sm text-gray-500">יש לך קוד הזמנה?</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create Private List Modal */}
      {showCreate && (
        <Modal title="רשימה פרטית חדשה" onClose={() => { setShowCreate(false); setNewL({ name: '', icon: '📋', color: '#14B8A6' }); setCreateError(''); }}>
          {createError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-600 text-sm mb-4 text-center">
              ⚠️ {createError}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם הרשימה</label>
            <input
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none text-right"
              value={newL.name}
              onChange={(e) => { setNewL({ ...newL, name: e.target.value }); setCreateError(''); }}
              placeholder="קניות שבועיות"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">אייקון</label>
            <div className="flex gap-2 flex-wrap">
              {LIST_ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setNewL({ ...newL, icon: i })}
                  className={`w-12 h-12 rounded-xl text-xl cursor-pointer ${
                    newL.icon === i ? 'border-2 border-teal-500 bg-teal-50' : 'border border-gray-200 bg-white'
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
                  onClick={() => setNewL({ ...newL, color: c })}
                  className="w-10 h-10 rounded-full cursor-pointer"
                  style={{ background: c, border: newL.color === c ? '3px solid #111' : 'none' }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => { haptic('medium'); handleCreate(false); }}
            className="w-full py-4 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
          >
            צור רשימה
          </button>
        </Modal>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <Modal title="קבוצה חדשה" onClose={() => { setShowCreateGroup(false); setNewL({ name: '', icon: '👨‍👩‍👧‍👦', color: '#14B8A6' }); setCreateError(''); }}>
          {createError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-600 text-sm mb-4 text-center">
              ⚠️ {createError}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם הקבוצה</label>
            <input
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none text-right"
              value={newL.name}
              onChange={(e) => { setNewL({ ...newL, name: e.target.value }); setCreateError(''); }}
              placeholder="קניות משפחתיות"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">אייקון</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setNewL({ ...newL, icon: i })}
                  className={`w-12 h-12 rounded-xl text-xl cursor-pointer ${
                    newL.icon === i ? 'border-2 border-teal-500 bg-teal-50' : 'border border-gray-200 bg-white'
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
                  onClick={() => setNewL({ ...newL, color: c })}
                  className="w-10 h-10 rounded-full cursor-pointer"
                  style={{ background: c, border: newL.color === c ? '3px solid #111' : 'none' }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => { haptic('medium'); handleCreate(true); }}
            className="w-full py-4 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
          >
            צור קבוצה
          </button>
        </Modal>
      )}

      {/* Join Group Modal */}
      {showJoin && (
        <Modal title="הצטרף לקבוצה" onClose={() => { setShowJoin(false); setJoinError(''); setJoinCode(''); setJoinPass(''); }}>
          <div className="text-center mb-5">
            <p className="text-gray-500 text-sm">הזן את הקוד והסיסמה שקיבלת</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">קוד קבוצה</label>
            <input
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-lg outline-none text-center tracking-widest uppercase"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">סיסמה</label>
            <input
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-lg outline-none text-center tracking-widest"
              value={joinPass}
              onChange={(e) => setJoinPass(e.target.value)}
              placeholder="••••"
              maxLength={4}
            />
          </div>
          {joinError && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-600 text-sm mb-4 text-center">
              {joinError}
            </div>
          )}
          <button
            onClick={() => { haptic('medium'); handleJoin(); }}
            className="w-full py-4 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
          >
            הצטרף לקבוצה
          </button>
        </Modal>
      )}

      {/* Edit List Modal */}
      {editList && (
        <Modal title={editList.isGroup ? 'עריכת קבוצה' : 'עריכת רשימה'} onClose={() => setEditList(null)}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">שם</label>
            <input
              className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none text-right"
              value={editList.name}
              onChange={(e) => setEditList({ ...editList, name: e.target.value })}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">אייקון</label>
            <div className="flex gap-2 flex-wrap">
              {(editList.isGroup ? GROUP_ICONS : LIST_ICONS).map((i) => (
                <button
                  key={i}
                  onClick={() => setEditList({ ...editList, icon: i })}
                  className={`w-12 h-12 rounded-xl text-xl cursor-pointer ${
                    editList.icon === i ? 'border-2 border-teal-500 bg-teal-50' : 'border border-gray-200 bg-white'
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
                  onClick={() => setEditList({ ...editList, color: c })}
                  className="w-10 h-10 rounded-full cursor-pointer"
                  style={{ background: c, border: editList.color === c ? '3px solid #111' : 'none' }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => { haptic('medium'); onEditList(editList); setEditList(null); showToast('נשמר'); }}
            className="w-full py-4 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30"
          >
            שמור שינויים
          </button>
          <button
            onClick={() => { setConfirmDeleteList(editList); setEditList(null); }}
            className="w-full py-3.5 rounded-xl border-none bg-red-50 text-red-600 text-base font-semibold cursor-pointer mt-3"
          >
            מחק {editList.isGroup ? 'קבוצה' : 'רשימה'}
          </button>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteList && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setConfirmDeleteList(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[90%] max-w-[320px] animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">
              {confirmDeleteList.isGroup ? 'מחיקת קבוצה' : 'מחיקת רשימה'}
            </h3>
            <p className="text-base text-gray-500 mb-6 text-center">
              למחוק את "{confirmDeleteList.name}"? פעולה זו לא ניתנת לביטול.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { haptic('light'); setConfirmDeleteList(null); }}
                className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold"
              >
                ביטול
              </button>
              <button
                onClick={() => { haptic('medium'); onDeleteList(confirmDeleteList.id); setConfirmDeleteList(null); showToast('נמחק'); }}
                className="flex-1 py-3.5 rounded-xl border-none bg-gradient-to-br from-red-500 to-red-600 text-white text-base font-semibold shadow-lg"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <Modal title="התראות" onClose={() => setShowNotifications(false)}>
          {myNotifications.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-5xl">🔔</span>
              <p className="text-gray-500 text-base mt-3">אין התראות חדשות</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {myNotifications.map((n) => {
                const isLeave = n.type === 'leave';
                return (
                  <div
                    key={n.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                      isLeave ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full text-white flex items-center justify-center text-lg ${
                        isLeave ? 'bg-red-500' : 'bg-green-500'
                      }`}
                    >
                      {isLeave ? '👋' : '🎉'}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-semibold ${isLeave ? 'text-red-800' : 'text-green-800'}`}>
                        {n.userName} {isLeave ? 'עזב/ה את הקבוצה' : 'הצטרף/ה לקבוצה'}
                      </div>
                      <div className={`text-sm ${isLeave ? 'text-red-600' : 'text-green-600'}`}>
                        {n.listName}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => {
                  haptic('medium');
                  myNotifications.forEach((n) => onMarkNotificationsRead(n.listId));
                  setShowNotifications(false);
                }}
                className="w-full py-4 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-500/30 mt-2"
              >
                סמן הכל כנקרא
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
