import { haptic } from '../helpers';

type NavItem = 'home' | 'profile' | 'settings';

interface BottomNavProps {
  active: NavItem;
  onNavigate: (item: NavItem) => void;
}

const navItems: { id: NavItem; icon: string; label: string }[] = [
  { id: 'settings', icon: '⚙️', label: 'הגדרות' },
  { id: 'home', icon: '🏠', label: 'בית' },
  { id: 'profile', icon: '👤', label: 'פרופיל' }
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white flex justify-around py-2 safe-area-bottom border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            haptic('light');
            onNavigate(item.id);
          }}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border-none bg-transparent cursor-pointer ${
            active === item.id ? 'text-teal-500' : 'text-gray-400'
          }`}
          aria-label={item.label}
          aria-current={active === item.id ? 'page' : undefined}
        >
          <span className="text-2xl">{item.icon}</span>
          <span className="text-xs font-semibold">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
