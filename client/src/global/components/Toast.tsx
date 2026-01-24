import type { ToastProps } from '../types';
import { TOAST_CONFIG } from '../styles';

export function Toast({ msg, type = 'success' }: ToastProps) {
  if (!msg) return null;

  const config = TOAST_CONFIG[type];
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
      <span>{msg}</span>
    </div>
  );
}
