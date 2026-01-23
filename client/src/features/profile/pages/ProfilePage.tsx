import { useState } from 'react';
import type { User } from '../../../shared/types';
import { haptic } from '../../../shared/helpers';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  onBack: () => void;
  onLogout: () => void;
}

const avatarColors = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#0891B2'];
const avatarEmojis = ['', '😊', '😎', '🦁', '🐻', '🦊', '🐸', '🌟', '⚡', '🔥'];

export function ProfilePage({ user, onUpdateUser, onBack, onLogout }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor || '#14B8A6',
    avatarEmoji: user.avatarEmoji || ''
  });
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleSave = () => {
    haptic('medium');
    onUpdateUser(editData);
    setIsEditing(false);
  };

  const handleLogout = () => {
    haptic('medium');
    onLogout();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 h-screen flex flex-col overflow-hidden max-w-[430px] mx-auto left-1/2 -translate-x-1/2">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-500 pt-12 pb-10 px-5 text-center flex-shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { haptic('light'); onBack(); }}
            className="w-11 h-11 rounded-xl border-none bg-white/20 cursor-pointer flex items-center justify-center backdrop-blur-sm"
            aria-label="חזור"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="flex-1 text-white text-xl font-bold">פרופיל</h1>
          {!isEditing && (
            <button
              onClick={() => { haptic('light'); setIsEditing(true); }}
              className="w-11 h-11 rounded-xl border-none bg-white/20 cursor-pointer flex items-center justify-center backdrop-blur-sm"
              aria-label="ערוך"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30 text-4xl text-white font-bold"
          style={{ backgroundColor: isEditing ? editData.avatarColor : (user.avatarColor || 'rgba(255,255,255,0.2)') }}
        >
          {(isEditing ? editData.avatarEmoji : user.avatarEmoji) || user.name.charAt(0)}
        </div>

        {!isEditing && (
          <>
            <div className="text-white text-xl font-bold">{user.name}</div>
            <div className="text-white/80 text-sm mt-1">{user.email}</div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 -mt-5">
        {isEditing ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            {/* Color Selection */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">צבע אווטר</label>
              <div className="flex gap-2.5 flex-wrap">
                {avatarColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditData({ ...editData, avatarColor: c })}
                    className="w-10 h-10 rounded-full cursor-pointer"
                    style={{
                      backgroundColor: c,
                      border: editData.avatarColor === c ? '3px solid #111' : '3px solid transparent'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Emoji Selection */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">אימוג׳י (אופציונלי)</label>
              <div className="flex gap-2 flex-wrap">
                {avatarEmojis.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEditData({ ...editData, avatarEmoji: e })}
                    className={`w-11 h-11 rounded-lg text-xl cursor-pointer flex items-center justify-center ${
                      editData.avatarEmoji === e
                        ? 'border-2 border-teal-500 bg-teal-50'
                        : 'border border-gray-200 bg-white'
                    }`}
                  >
                    {e || <span className="text-xs text-gray-400">ללא</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">שם</label>
              <input
                className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none text-right"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">אימייל</label>
              <input
                className="w-full py-3.5 px-4 rounded-xl border-2 border-gray-200 text-base outline-none"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                dir="ltr"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { haptic('light'); setIsEditing(false); }}
                className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3.5 rounded-xl border-none bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-base font-semibold shadow-lg shadow-teal-500/30"
              >
                שמור
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h3 className="text-base font-bold mb-4">סטטיסטיקות</h3>
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-2xl font-bold text-teal-500">0</div>
                  <div className="text-sm text-gray-500">רשימות</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-500">0</div>
                  <div className="text-sm text-gray-500">מוצרים</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-500">0</div>
                  <div className="text-sm text-gray-500">קבוצות</div>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => setConfirmLogout(true)}
              className="w-full py-3.5 rounded-xl border-none bg-red-50 text-red-600 text-base font-semibold"
            >
              התנתק
            </button>
          </>
        )}
      </div>

      {/* Confirm Logout Modal */}
      {confirmLogout && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setConfirmLogout(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[90%] max-w-[320px] animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">התנתקות</h3>
            <p className="text-base text-gray-500 mb-6 text-center">האם אתה בטוח שברצונך להתנתק?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { haptic('light'); setConfirmLogout(false); }}
                className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold"
              >
                ביטול
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3.5 rounded-xl border-none bg-gradient-to-br from-red-500 to-red-600 text-white text-base font-semibold shadow-lg"
              >
                התנתק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
