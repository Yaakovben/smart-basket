import { useState } from 'react';
import { haptic } from '../../../shared/helpers';

interface SettingsPageProps {
  onBack: () => void;
  onDeleteAllData: () => void;
}

export function SettingsPage({ onBack, onDeleteAllData }: SettingsPageProps) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteAllData = () => {
    haptic('heavy');
    onDeleteAllData();
    setConfirmDelete(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 h-screen flex flex-col overflow-hidden max-w-[430px] mx-auto left-1/2 -translate-x-1/2">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-500 pt-12 pb-6 px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { haptic('light'); onBack(); }}
            className="w-11 h-11 rounded-xl border-none bg-white/20 cursor-pointer flex items-center justify-center backdrop-blur-sm"
            aria-label="חזור"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="flex-1 text-white text-xl font-bold">הגדרות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5">
        {/* Preferences */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3.5 p-4 border-b border-gray-100">
            <span className="text-xl">🔔</span>
            <span className="flex-1 text-base">התראות</span>
            <button
              onClick={() => { haptic('light'); setNotifications(!notifications); }}
              className="w-11 h-6.5 rounded-full p-0.5 cursor-pointer border-none"
              style={{ backgroundColor: notifications ? '#14B8A6' : '#E5E7EB' }}
            >
              <div
                className="w-5.5 h-5.5 rounded-full bg-white transition-all"
                style={{ marginRight: notifications ? 'auto' : '0' }}
              />
            </button>
          </div>
          <div className="flex items-center gap-3.5 p-4 border-b border-gray-100">
            <span className="text-xl">🌙</span>
            <span className="flex-1 text-base">מצב כהה</span>
            <button
              onClick={() => { haptic('light'); setDarkMode(!darkMode); }}
              className="w-11 h-6.5 rounded-full p-0.5 cursor-pointer border-none"
              style={{ backgroundColor: darkMode ? '#14B8A6' : '#E5E7EB' }}
            >
              <div
                className="w-5.5 h-5.5 rounded-full bg-white transition-all"
                style={{ marginRight: darkMode ? 'auto' : '0' }}
              />
            </button>
          </div>
          <div className="flex items-center gap-3.5 p-4">
            <span className="text-xl">🌐</span>
            <span className="flex-1 text-base">שפה</span>
            <span className="text-gray-500 text-sm">עברית</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* Support */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mt-4">
          <div className="flex items-center gap-3.5 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
            <span className="text-xl">❓</span>
            <span className="flex-1 text-base">עזרה ותמיכה</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
          <div className="flex items-center gap-3.5 p-4 cursor-pointer hover:bg-gray-50">
            <span className="text-xl">ℹ️</span>
            <span className="flex-1 text-base">אודות</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mt-4">
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-3.5 p-4 w-full border-none bg-transparent cursor-pointer text-red-600 hover:bg-red-50"
          >
            <span className="text-xl">🗑️</span>
            <span className="flex-1 text-base text-right">מחק את כל הנתונים</span>
          </button>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8 mb-20">SmartBasket גרסה 1.0.0</p>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[90%] max-w-[320px] animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">מחיקת נתונים</h3>
            <p className="text-base text-gray-500 mb-6 text-center">פעולה זו תמחק את כל הנתונים שלך לצמיתות. האם אתה בטוח?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { haptic('light'); setConfirmDelete(false); }}
                className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold"
              >
                ביטול
              </button>
              <button
                onClick={handleDeleteAllData}
                className="flex-1 py-3.5 rounded-xl border-none bg-gradient-to-br from-red-500 to-red-600 text-white text-base font-semibold shadow-lg"
              >
                מחק הכל
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
