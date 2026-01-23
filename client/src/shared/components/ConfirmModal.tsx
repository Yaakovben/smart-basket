import { haptic } from '../helpers';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'אישור' }: ConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onCancel}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          width: '90%',
          maxWidth: '320px',
          margin: 'auto',
          animation: 'scaleIn 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 12px', textAlign: 'center' }}>{title}</h3>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 24px', textAlign: 'center' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => { haptic('light'); onCancel(); }}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: '2px solid #E5E7EB',
              background: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '48px'
            }}
          >
            ביטול
          </button>
          <button
            onClick={() => { haptic('medium'); onConfirm(); }}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s ease',
              minHeight: '48px'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
