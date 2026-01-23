import type { ToastType } from '../types';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
}

const toastConfig: Record<ToastType, { icon: string; bg: string; shadow: string }> = {
  success: { icon: '✓', bg: 'linear-gradient(135deg, #22C55E, #16A34A)', shadow: 'rgba(34, 197, 94, 0.3)' },
  error: { icon: '✕', bg: 'linear-gradient(135deg, #EF4444, #DC2626)', shadow: 'rgba(239, 68, 68, 0.3)' },
  info: { icon: 'ℹ', bg: 'linear-gradient(135deg, #14B8A6, #0D9488)', shadow: 'rgba(20, 184, 166, 0.3)' }
};

export function Toast({ message, type = 'success', visible }: ToastProps) {
  if (!message || !visible) return null;

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
      <span>{message}</span>
    </div>
  );
}
