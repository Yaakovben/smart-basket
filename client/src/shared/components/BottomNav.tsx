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
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '430px',
      background: 'white',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0 max(24px, env(safe-area-inset-bottom))',
      borderTop: '1px solid #F3F4F6',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
      zIndex: 10
    }}>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            haptic('light');
            onNavigate(item.id);
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: active === item.id ? '#14B8A6' : '#9CA3AF'
          }}
        >
          <span style={{ fontSize: '24px' }}>{item.icon}</span>
          <span style={{ fontSize: '12px', fontWeight: '600' }}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
