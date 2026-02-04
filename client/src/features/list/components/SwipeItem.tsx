import { useState, useRef, useEffect, memo, useCallback } from 'react';
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
  const [isSwiping, setIsSwiping] = useState(false);

  // Refs for gesture tracking (avoid re-renders during gesture)
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const currentOffset = useRef(0);
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const hasCalledOpen = useRef(false);
  const justSwiped = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Velocity tracking
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);

  const icon = CATEGORY_ICONS[product.category as ProductCategory] || '📦';

  // Close this item when another item is opened
  useEffect(() => {
    if (!isOpen && offset > 0) {
      setOffset(0);
      currentOffset.current = 0;
    }
  }, [isOpen, offset]);

  // WhatsApp-like rubber band effect
  const calcOffset = useCallback((rawOffset: number) => {
    if (rawOffset < 0) {
      return rawOffset * 0.2; // Resistance when swiping wrong direction
    }
    if (rawOffset <= SWIPE_ACTIONS_WIDTH) {
      return rawOffset;
    }
    // Beyond max: stronger resistance
    const extra = rawOffset - SWIPE_ACTIONS_WIDTH;
    return SWIPE_ACTIONS_WIDTH + extra * 0.15;
  }, []);

  // Direct DOM manipulation for smoother animation during gesture
  const updateTransform = useCallback((value: number) => {
    if (elementRef.current) {
      elementRef.current.style.transform = `translateX(${-value}px)`;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startOffset.current = currentOffset.current;
    lastX.current = touch.clientX;
    lastTime.current = performance.now();
    velocity.current = 0;
    directionLocked.current = null;
    hasCalledOpen.current = false;

    // Remove transition during gesture for instant response
    if (elementRef.current) {
      elementRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const dx = startX.current - touch.clientX;
    const dy = touch.clientY - startY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Calculate velocity using performance.now() for precision
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastX.current - touch.clientX) / dt;
    }
    lastX.current = touch.clientX;
    lastTime.current = now;

    // Lock direction after minimal movement (3px) - WhatsApp-like instant detection
    if (!directionLocked.current && (absDx > 3 || absDy > 3)) {
      // If horizontal movement is at least equal to vertical, treat as horizontal swipe
      if (absDx >= absDy) {
        directionLocked.current = 'horizontal';
        setIsSwiping(true);
        // Prevent all scrolling
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      } else {
        directionLocked.current = 'vertical';
      }
    }

    // Let vertical scroll happen normally
    if (directionLocked.current === 'vertical') {
      return;
    }

    // Handle horizontal swipe
    if (directionLocked.current === 'horizontal') {
      e.preventDefault();
      e.stopPropagation();

      // Notify parent to close other items
      if (!hasCalledOpen.current && dx > 15) {
        hasCalledOpen.current = true;
        onOpen();
      }

      // Calculate and apply offset directly to DOM for smoothness
      const rawOffset = startOffset.current + dx;
      const newOffset = calcOffset(rawOffset);
      currentOffset.current = newOffset;
      updateTransform(newOffset);
    }
  }, [calcOffset, updateTransform, onOpen]);

  const handleTouchEnd = useCallback(() => {
    // Restore body styles
    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    if (directionLocked.current === 'horizontal') {
      justSwiped.current = true;
      setTimeout(() => { justSwiped.current = false; }, 150);

      // Restore transition for snap animation
      if (elementRef.current) {
        elementRef.current.style.transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
      }

      // WhatsApp-like snap logic: velocity + position
      const highVelocity = Math.abs(velocity.current) > 0.4;
      const finalOffset = currentOffset.current;

      let shouldOpen = false;
      if (highVelocity) {
        // Fast swipe - direction determines outcome
        shouldOpen = velocity.current > 0;
      } else {
        // Slow swipe - position determines outcome
        shouldOpen = finalOffset > SWIPE_CONFIG.openThreshold;
      }

      if (shouldOpen && finalOffset > 0) {
        currentOffset.current = SWIPE_ACTIONS_WIDTH;
        setOffset(SWIPE_ACTIONS_WIDTH);
        updateTransform(SWIPE_ACTIONS_WIDTH);
        haptic('light');
      } else {
        currentOffset.current = 0;
        setOffset(0);
        updateTransform(0);
        if (isOpen) onClose();
      }
    }

    directionLocked.current = null;
    setIsSwiping(false);
    velocity.current = 0;
  }, [isOpen, onClose, updateTransform]);

  const doAction = useCallback((fn: () => void) => {
    currentOffset.current = 0;
    setOffset(0);
    onClose();
    fn();
  }, [onClose]);

  const handleClick = useCallback(() => {
    if (justSwiped.current) return;
    if (currentOffset.current > 10) {
      currentOffset.current = 0;
      setOffset(0);
      onClose();
    } else {
      haptic('light');
      onClick();
    }
  }, [onClick, onClose]);

  return (
    <Box sx={{
      position: 'relative',
      mb: '6px',
      borderRadius: '14px',
      height: '72px',
      overflow: 'hidden',
      touchAction: 'pan-y',
      WebkitUserSelect: 'none',
      userSelect: 'none'
    }}>
      {/* Action buttons - visible when swiping */}
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
        opacity: isSwiping || offset > 10 ? 1 : 0,
        visibility: isSwiping || offset > 5 ? 'visible' : 'hidden',
        transition: isSwiping ? 'none' : 'opacity 0.2s ease',
        pointerEvents: offset >= SWIPE_ACTIONS_WIDTH * 0.6 ? 'auto' : 'none'
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

      {/* Swipeable content */}
      <Box
        ref={elementRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          bgcolor: isPurchased ? '#F3F4F6' : 'background.paper',
          px: '14px',
          borderRadius: '14px',
          transform: `translateX(${-offset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
          willChange: 'transform',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          pointerEvents: offset >= SWIPE_ACTIONS_WIDTH * 0.6 ? 'none' : 'auto',
          WebkitTapHighlightColor: 'transparent'
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
          fontSize: '22px',
          flexShrink: 0
        }}>{icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: '15px',
            fontWeight: 600,
            color: isPurchased ? 'text.secondary' : 'text.primary',
            textDecoration: isPurchased ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {product.name}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
            {product.quantity} {product.unit} • {product.addedBy === currentUserName ? t('you') : product.addedBy}
          </Typography>
        </Box>
        {isPurchased && <Box component="span" sx={{ fontSize: '20px', flexShrink: 0 }}>✅</Box>}
      </Box>
    </Box>
  );
});
