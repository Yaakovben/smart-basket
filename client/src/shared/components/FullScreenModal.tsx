import type { ReactNode } from 'react';
import { haptic } from '../helpers';

interface FullScreenModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function FullScreenModal({ title, onClose, children }: FullScreenModalProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'white',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      maxWidth: '430px',
      margin: '0 auto',
      left: '50%',
      transform: 'translateX(-50%)'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #F3F4F6',
        flexShrink: 0,
        minHeight: '64px',
        background: 'white'
      }}>
        <button
          onClick={() => {
            haptic('light');
            onClose();
          }}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: '#F3F4F6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B7280',
            transition: 'all 0.2s ease'
          }}
        >
          ✕
        </button>
        <h1 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#111827',
          margin: 0,
          flex: 1,
          textAlign: 'center'
        }}>{title}</h1>
        <div style={{ width: '44px' }} />
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        padding: '20px',
        paddingBottom: '32px'
      }}>
        {children}
      </div>
    </div>
  );
}
