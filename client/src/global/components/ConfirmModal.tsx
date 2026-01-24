import type { ConfirmModalProps } from '../types';
import { haptic } from '../helpers';
import { S } from '../styles';

export function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'אישור' }: ConfirmModalProps) {
  return (
    <div
      style={{ ...S.overlay, animation: 'fadeIn 0.2s ease', alignItems: 'center' }}
      onClick={onCancel}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div style={{ ...S.confirmBox, animation: 'scaleIn 0.3s ease' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 12px', textAlign: 'center' }}>{title}</h3>
        <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 24px', textAlign: 'center' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => { haptic('light'); onCancel(); }} style={S.cancelBtn}>ביטול</button>
          <button onClick={() => { haptic('medium'); onConfirm(); }} style={S.dangerBtn}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
