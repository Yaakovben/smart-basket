import type { ModalProps } from '../types';
import { haptic } from '../helpers';
import { S } from '../styles';

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      style={{ ...S.overlay, animation: 'fadeIn 0.2s ease' }}
      onClick={() => { haptic('light'); onClose(); }}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        style={{ ...S.sheet, animation: 'slideUp 0.3s ease' }}
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        <div style={S.handle} />
        <h2 style={S.sheetTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
