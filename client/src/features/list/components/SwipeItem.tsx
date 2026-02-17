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
  const [swiping, setSwiping] = useState(false);

  // Refs למעקב אחר מחוות
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const hasCalledOpen = useRef(false);
  const justSwiped = useRef(false);

  // מעקב מהירות
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);

  const icon = CATEGORY_ICONS[product.category as ProductCategory] || '📦';

  // סנכרון עם state חיצוני - סגירה כשפריט אחר נפתח
  useEffect(() => {
    if (!isOpen && offset > 0) {
      setOffset(0);
    }
  }, [isOpen, offset]);

  // ניקוי סגנונות body ב-unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // חישוב אפקט גומייה
  const calcOffset = useCallback((rawOffset: number): number => {
    // החלקה ימינה (כיוון שגוי) - התנגדות חזקה
    if (rawOffset < 0) {
      return -Math.sqrt(Math.abs(rawOffset)) * 3;
    }
    // טווח רגיל - תנועה 1:1
    if (rawOffset <= SWIPE_ACTIONS_WIDTH) {
      return rawOffset;
    }
    // מעבר למקסימום - התנגדות גומייה
    const extra = rawOffset - SWIPE_ACTIONS_WIDTH;
    return SWIPE_ACTIONS_WIDTH + Math.sqrt(extra) * 5;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startOffset.current = offset;
    lastX.current = touch.clientX;
    lastTime.current = performance.now();
    velocity.current = 0;
    directionLocked.current = null;
    hasCalledOpen.current = false;
    setSwiping(false);
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = startX.current - touch.clientX; // positive = swipe left (open)
    const dy = touch.clientY - startY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // חישוב מהירות
    const now = performance.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (lastX.current - touch.clientX) / dt;
    }
    lastX.current = touch.clientX;
    lastTime.current = now;

    // נעילת כיוון אחרי 5px תנועה
    if (!directionLocked.current && (absDx > 5 || absDy > 5)) {
      // אופקי אם dx >= dy
      if (absDx >= absDy) {
        directionLocked.current = 'horizontal';
        setSwiping(true);
        // חסימת גלילה
        e.preventDefault();
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      } else {
        directionLocked.current = 'vertical';
        // לאפשר גלילה
        return;
      }
    }

    // אנכי - לא עושים כלום
    if (directionLocked.current === 'vertical') {
      return;
    }

    // טיפול בהחלקה אופקית
    if (directionLocked.current === 'horizontal') {
      e.preventDefault();
      e.stopPropagation();

      // סגירת פריטים אחרים בתחילת החלקה
      if (!hasCalledOpen.current && dx > 10) {
        hasCalledOpen.current = true;
        onOpen();
      }

      // חישוב offset עם אפקט גומייה
      const rawOffset = startOffset.current + dx;
      const newOffset = calcOffset(rawOffset);
      setOffset(newOffset);
    }
  }, [calcOffset, onOpen]);

  const handleTouchEnd = useCallback(() => {
    // שחזור סגנונות body
    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    if (directionLocked.current !== 'horizontal') {
      directionLocked.current = null;
      return;
    }

    justSwiped.current = true;
    setTimeout(() => { justSwiped.current = false; }, 100);

    // קביעת מצב סופי לפי מהירות ומיקום
    const currentVelocity = velocity.current;
    const currentOffset = offset;

    // זיהוי החלקה מהירה
    const isFastSwipe = Math.abs(currentVelocity) > 0.3;

    let finalOffset = 0;

    if (isFastSwipe) {
      if (currentVelocity > 0.3) {
        // החלקה מהירה שמאלה = פתיחה
        finalOffset = SWIPE_ACTIONS_WIDTH;
        haptic('light');
      } else if (currentVelocity < -0.3) {
        // החלקה מהירה ימינה = סגירה
        finalOffset = 0;
      }
    } else {
      // ללא מהירות - המיקום קובע
      if (currentOffset > SWIPE_CONFIG.openThreshold) {
        finalOffset = SWIPE_ACTIONS_WIDTH;
        haptic('light');
      } else {
        finalOffset = 0;
      }
    }

    setOffset(finalOffset);

    if (finalOffset === 0 && isOpen) {
      onClose();
    }

    directionLocked.current = null;
    setSwiping(false);
    velocity.current = 0;
  }, [offset, isOpen, onClose]);

  const handleTouchCancel = useCallback(() => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    directionLocked.current = null;
    setSwiping(false);
    // הצמדה למצב הקרוב
    if (offset > SWIPE_ACTIONS_WIDTH / 2) {
      setOffset(SWIPE_ACTIONS_WIDTH);
    } else {
      setOffset(0);
    }
  }, [offset]);

  const doAction = useCallback((fn: () => void) => {
    setOffset(0);
    onClose();
    fn();
  }, [onClose]);

  const handleClick = useCallback(() => {
    if (justSwiped.current) return;

    if (offset > 20) {
      // סגירה אם פתוח
      setOffset(0);
      onClose();
    } else {
      haptic('light');
      onClick();
    }
  }, [offset, onClick, onClose]);

  // חישוב שקיפות כפתור לפי offset
  const buttonOpacity = Math.min(1, Math.max(0, offset / 40));

  return (
    <Box
      sx={{
        position: 'relative',
        mb: '6px',
        borderRadius: '14px',
        height: '72px',
        overflow: 'hidden',
        touchAction: swiping ? 'none' : 'pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {/* Action buttons */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: SWIPE_ACTIONS_WIDTH,
          display: 'flex',
          flexDirection: 'row-reverse',
          borderRadius: '14px',
          overflow: 'hidden',
          opacity: buttonOpacity,
          visibility: offset > 5 ? 'visible' : 'hidden',
          pointerEvents: offset >= SWIPE_ACTIONS_WIDTH * 0.3 ? 'auto' : 'none'
        }}
      >
        <Box role="button" aria-label={t('delete')} onClick={() => { haptic('medium'); doAction(onDelete); }} sx={{ ...actionBtnStyle, bgcolor: '#EF4444' }}>
          <span>🗑️</span>
          <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>{t('delete')}</Typography>
        </Box>
        <Box role="button" aria-label={t('edit')} onClick={() => { haptic('light'); doAction(onEdit); }} sx={{ ...actionBtnStyle, bgcolor: '#14B8A6' }}>
          <span>✏️</span>
          <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>{t('edit')}</Typography>
        </Box>
        <Box role="button" aria-label={isPurchased ? t('return') : t('purchased')} onClick={() => { haptic('light'); doAction(onToggle); }} sx={{ ...actionBtnStyle, bgcolor: isPurchased ? '#F59E0B' : '#22C55E' }}>
          <span>{isPurchased ? '↩️' : '✓'}</span>
          <Typography sx={{ fontSize: '11px', fontWeight: 600 }}>{isPurchased ? t('return') : t('purchased')}</Typography>
        </Box>
      </Box>

      {/* Swipeable content */}
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
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
          transition: swiping ? 'none' : 'transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)',
          willChange: swiping ? 'transform' : 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          pointerEvents: offset >= SWIPE_ACTIONS_WIDTH * 0.3 ? 'none' : 'auto',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <Box
          sx={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            bgcolor: isPurchased ? 'action.hover' : 'rgba(20, 184, 166, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            flexShrink: 0
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '15px',
              fontWeight: 600,
              color: isPurchased ? 'text.secondary' : 'text.primary',
              textDecoration: isPurchased ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
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
