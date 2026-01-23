import { haptic } from '../../../shared/helpers';

interface StatsPageProps {
  onBack: () => void;
}

export function StatsPage({ onBack }: StatsPageProps) {
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
          <h1 className="flex-1 text-white text-xl font-bold">סטטיסטיקות</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-6 text-6xl">
            📊
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">בקרוב!</h2>
          <p className="text-gray-500 text-base max-w-xs mx-auto">
            עמוד הסטטיסטיקות יהיה זמין בקרוב עם נתונים מפורטים על הרשימות והקניות שלך.
          </p>
        </div>
      </div>
    </div>
  );
}
