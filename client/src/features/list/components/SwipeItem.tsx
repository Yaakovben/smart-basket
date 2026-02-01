import { useState, useRef, useEffect, memo } from 'react';
import { Box, Typography } from '@mui/material';
import type { Product } from '../../../global/types';
import { haptic, CATEGORY_ICONS, SWIPE_ACTIONS_WIDTH, SWIPE_CONFIG } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';

type ProductCategory = 'מוצרי חלב' | 'מאפים' | 'ירקות' | 'פירות' | 'בשר' | 'משקאות' | 'ממתקים' | 'ניקיון' | 'אחר';

interface SwipeItemProps {
  product: Product;
  isPurchased: boolean;
  isOpen: boolean;
  currentUserName: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  onOpen: () => void;
  onClose: () => void;
}

const actionBtnStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  color: 'white',
  fontSize: '18px',
  cursor: 'pointer'
};

export const SwipeItem = memo(({ product, onToggle, onEdit, onDelete, onClick, isPurchased, isOpen, currentUserName, onOpen, onClose }: SwipeItemProps) => {
  const { t } = useSettings();
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOff = useRef(0);
  const hasCalledOpen = useRef(false);
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const justSwiped = useRef(false);
  // Velocity tracking for WhatsApp-like momentum
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const icon = CATEGORY_ICONS[product.category as ProductCategory] || '📦';

  // Close this item when another item is opened
  useEffect(() => {
    if (!isOpen && offset > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync external isOpen state with internal offset
      setOffset(0);
    }
  }, [isOpen, offset]);

  // WhatsApp-like rubber band effect - works in both directions
  const calcOffset = (rawOffset: number) => {
    // Swiping right (negative) - gentle rubber band resistance
    if (rawOffset < 0) {
      return rawOffset * 0.25; // 25% resistance when swiping wrong direction
    }
    // Normal range
    if (rawOffset <= SWIPE_ACTIONS_WIDTH) {
      return rawOffset;
    }
    // Beyond max: apply stronger resistance (20% of extra distance)
    const extra = rawOffset - SWIPE_ACTIONS_WIDTH;
    return SWIPE_ACTIONS_WIDTH + extra * 0.2;
  };

  const handlers = {
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startOff.current = offset;
      lastX.current = touch.clientX;
      lastTime.current = Date.now();
      velocity.current = 0;
      setSwiping(false);
      hasCalledOpen.current = false;
      directionLocked.current = null;
    },
    onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => {
      const touch = e.touches[0];
      const dx = startX.current - touch.clientX;
      const dy = touch.clientY - startY.current;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Calculate velocity for momentum
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        velocity.current = (lastX.current - touch.clientX) / dt;
      }
      lastX.current = touch.clientX;
      lastTime.current = now;

      // Lock direction after 8px movement - more responsive
      if (!directionLocked.current && (absDx > 8 || absDy > 8)) {
        // WhatsApp-like: horizontal if ratio is > 1.2x (slightly more forgiving)
        directionLocked.current = absDx > absDy * 1.2 ? 'horizontal' : 'vertical';
        if (directionLocked.current === 'horizontal') {
          e.preventDefault();
          document.body.style.overflow = 'hidden';
          document.body.style.touchAction = 'none';
        }
      }

      // If locked to vertical, let the page scroll normally
      if (directionLocked.current === 'vertical') {
        return;
      }

      // Handle horizontal swipe - always allow movement for fluid feel
      if (directionLocked.current === 'horizontal') {
        e.preventDefault();
        e.stopPropagation();

        if (!swiping) {
          setSwiping(true);
        }

        // Call onOpen when swiping left to close other items
        if (!hasCalledOpen.current && dx > 20) {
          hasCalledOpen.current = true;
          onOpen();
        }

        const rawOffset = startOff.current + dx;
        setOffset(calcOffset(rawOffset));
      }
    },
    onTouchEnd: () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      directionLocked.current = null;

      if (swiping) {
        justSwiped.current = true;
        setTimeout(() => { justSwiped.current = false; }, SWIPE_CONFIG.debounceMs);

        // WhatsApp-like: use velocity + position to determine final state
        // High velocity (> 0.5 px/ms) = snap based on direction regardless of position
        // Low velocity = snap based on position threshold
        const highVelocityThreshold = 0.5;
        const shouldOpen = velocity.current > highVelocityThreshold ||
          (velocity.current > -highVelocityThreshold && offset > SWIPE_CONFIG.openThreshold);

        if (shouldOpen && offset > 0) {
          setOffset(SWIPE_ACTIONS_WIDTH);
          haptic('light');
        } else {
          setOffset(0);
          if (isOpen) onClose();
        }
      }
      setSwiping(false);
      velocity.current = 0;
    }
  };

  const doAction = (fn: () => void) => { setOffset(0); onClose(); fn(); };

  return (
    <Box sx={{ position: 'relative', mb: '6px', borderRadius: '14px', height: '72px', overflow: 'hidden' }}>
      {/* Action buttons background */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: SWIPE_ACTIONS_WIDTH,
        display: 'flex',
        flexDirection: 'row-reverse',
        borderRadius: '14px',
        overflow: 'hidden',
        opacity: offset > 0 ? 1 : 0,
        transition: 'opacity 0.15s ease',
        pointerEvents: offset >= SWIPE_ACTIONS_WIDTH * 0.7 ? 'auto' : 'none'
      }}>
        <Box onClick={() => { haptic('medium'); doAction(onDelete); }} sx={{ ...actionBtnStyle, bgcolor: '#EF4444' }}>
          <span>🗑️</span>
          <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>{t('delete')}</Typography>
        </Box>
        <Box onClick={() => { haptic('light'); doAction(onEdit); }} sx={{ ...actionBtnStyle, bgcolor: '#14B8A6' }}>
          <span>✏️</span>
          <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>{t('edit')}</Typography>
        </Box>
        <Box onClick={() => { haptic('light'); doAction(onToggle); }} sx={{ ...actionBtnStyle, bgcolor: isPurchased ? '#F59E0B' : '#22C55E' }}>
          <span>{isPurchased ? '↩️' : '✓'}</span>
          <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>{isPurchased ? t('return') : t('purchased')}</Typography>
        </Box>
      </Box>
      <Box
        {...handlers}
        onClick={() => {
          if (justSwiped.current) return;
          if (offset > SWIPE_CONFIG.offsetClickThreshold) {
            setOffset(0);
            onClose();
          } else {
            haptic('light');
            onClick();
          }
        }}
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          bgcolor: isPurchased ? 'action.disabledBackground' : 'background.paper',
          px: '14px',
          borderRadius: '14px',
          transform: `translateX(${-offset}px)`,
          // WhatsApp-like spring animation - fast start, smooth overshoot
          transition: swiping ? 'none' : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
          willChange: swiping ? 'transform' : 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          pointerEvents: offset >= SWIPE_ACTIONS_WIDTH * 0.7 ? 'none' : 'auto'
        }}
      >
        <Box sx={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          bgcolor: isPurchased ? 'action.hover' : 'rgba(20, 184, 166, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px'
        }}>{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: isPurchased ? 'text.secondary' : 'text.primary', textDecoration: isPurchased ? 'line-through' : 'none' }}>
            {product.name}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
            {product.quantity} {product.unit} • {product.addedBy === currentUserName ? t('you') : product.addedBy}
          </Typography>
        </Box>
        {isPurchased && <Box component="span" sx={{ fontSize: '20px' }}>✅</Box>}
      </Box>
    </Box>
  );
});
