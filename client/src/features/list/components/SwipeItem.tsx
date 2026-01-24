import { useState, useRef } from 'react';
import type { SwipeItemProps, ProductCategory } from '../types/list-types';
import { S } from '../../../global/styles';
import { haptic, CATEGORY_ICONS, SWIPE_ACTIONS_WIDTH } from '../../../global/helpers';

export function SwipeItem({ product, onToggle, onEdit, onDelete, onClick, isPurchased, isOpen, onOpen, onClose }: SwipeItemProps) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOff = useRef(0);
  const icon = CATEGORY_ICONS[product.category as ProductCategory] || '📦';

  const handlers = {
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startOff.current = offset;
      setSwiping(false);
    },
    onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => {
      const dx = startX.current - e.touches[0].clientX;
      const dy = Math.abs(e.touches[0].clientY - startY.current);

      if (!swiping && Math.abs(dx) > 10 && Math.abs(dx) > dy) {
        setSwiping(true);
        document.body.style.overflow = 'hidden';
      }

      if (swiping) {
        e.preventDefault();
        setOffset(Math.max(0, Math.min(SWIPE_ACTIONS_WIDTH, startOff.current + dx)));
      }
    },
    onTouchEnd: () => {
      document.body.style.overflow = '';
      if (swiping) {
        if (offset > 60) {
          setOffset(SWIPE_ACTIONS_WIDTH);
          onOpen();
        } else {
          setOffset(0);
          if (isOpen) onClose();
        }
      }
      setSwiping(false);
    }
  };

  const doAction = (fn: () => void) => { setOffset(0); onClose(); fn(); };

  return (
    <div style={{ position: 'relative', marginBottom: '10px', borderRadius: '14px', height: '72px', overflow: 'hidden', background: '#F3F4F6' }}>
      {offset > 0 && (
        <div style={{ position: 'absolute' as const, top: 0, right: 0, bottom: 0, width: SWIPE_ACTIONS_WIDTH, display: 'flex', flexDirection: 'row-reverse' as const }}>
          <div onClick={() => { haptic('medium'); doAction(onDelete); }} style={{ ...S.actionBtn, background: '#EF4444' }}><span>🗑️</span><span style={S.actionLabel}>מחק</span></div>
          <div onClick={() => { haptic('light'); doAction(onEdit); }} style={{ ...S.actionBtn, background: '#14B8A6' }}><span>✏️</span><span style={S.actionLabel}>ערוך</span></div>
          <div onClick={() => { haptic('light'); doAction(onToggle); }} style={{ ...S.actionBtn, background: isPurchased ? '#F59E0B' : '#22C55E' }}>
            <span>{isPurchased ? '↩️' : '✓'}</span><span style={S.actionLabel}>{isPurchased ? 'החזר' : 'נקנה'}</span>
          </div>
        </div>
      )}
      {offset > 0 && offset < SWIPE_ACTIONS_WIDTH && (
        <div style={{
          position: 'absolute' as const,
          right: offset - 30,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '20px',
          opacity: Math.min(offset / 60, 1),
          pointerEvents: 'none'
        }}>➤</div>
      )}
      <div
        {...handlers}
        onClick={() => {
          if (offset > 10) {
            setOffset(0);
            onClose();
          } else {
            haptic('light');
            onClick();
          }
        }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: isPurchased ? '#FAFAFA' : 'white',
          padding: '0 14px',
          borderRadius: '14px',
          border: '1px solid #E5E7EB',
          transform: `translateX(-${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
          boxShadow: offset > 0 ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isPurchased ? '#F3F4F6' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', transition: 'transform 0.2s ease' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: isPurchased ? '#9CA3AF' : '#111827', textDecoration: isPurchased ? 'line-through' : 'none' }}>{product.name}</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>{product.quantity} {product.unit} • {product.addedBy}</div>
        </div>
        {isPurchased && <span style={{ fontSize: '20px' }}>✅</span>}
      </div>
    </div>
  );
}
