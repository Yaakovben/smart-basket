import type { ReactNode } from 'react';
import { haptic } from '../helpers';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={() => { haptic('light'); onClose(); }}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '24px 24px 0 0',
          width: '100%',
          maxWidth: '430px',
          maxHeight: '75vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 20px 32px',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div style={{ width: '40px', height: '4px', background: '#E5E7EB', borderRadius: '2px', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', margin: '0 0 20px' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
