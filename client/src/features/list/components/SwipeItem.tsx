import { useState, useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import type { Product } from '../../../global/types';
import { haptic, CATEGORY_ICONS, SWIPE_ACTIONS_WIDTH } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';

type ProductCategory = 'מוצרי חלב' | 'מאפים' | 'ירקות' | 'פירות' | 'בשר' | 'משקאות' | 'ממתקים' | 'ניקיון' | 'אחר';

interface SwipeItemProps {
  product: Product;
  isPurchased: boolean;
  isOpen: boolean;
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

export const SwipeItem = ({ product, onToggle, onEdit, onDelete, onClick, isPurchased, isOpen, onOpen, onClose }: SwipeItemProps) => {
  const { t } = useSettings();
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOff = useRef(0);
  const hasCalledOpen = useRef(false);
  const icon = CATEGORY_ICONS[product.category as ProductCategory] || '📦';

  // Close this item when another item is opened
  useEffect(() => {
    if (!isOpen && offset > 0) {
      setOffset(0);
    }
  }, [isOpen, offset]);

  // Rubber band effect - dampens movement beyond max width
  const calcOffset = (rawOffset: number) => {
    if (rawOffset <= SWIPE_ACTIONS_WIDTH) {
      return Math.max(0, rawOffset);
    }
    // Beyond max: apply resistance (30% of extra distance)
    const extra = rawOffset - SWIPE_ACTIONS_WIDTH;
    return SWIPE_ACTIONS_WIDTH + extra * 0.3;
  };

  const handlers = {
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startOff.current = offset;
      setSwiping(false);
      hasCalledOpen.current = false;
    },
    onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => {
      const dx = startX.current - e.touches[0].clientX;
      const dy = Math.abs(e.touches[0].clientY - startY.current);

      if (!swiping && Math.abs(dx) > 8 && Math.abs(dx) > dy * 1.5) {
        setSwiping(true);
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        // Call onOpen early to close other items
        if (!hasCalledOpen.current && dx > 0) {
          hasCalledOpen.current = true;
          onOpen();
        }
      }

      if (swiping) {
        e.preventDefault();
        e.stopPropagation();
        const rawOffset = startOff.current + dx;
        setOffset(calcOffset(rawOffset));
      }
    },
    onTouchEnd: () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (swiping) {
        if (offset > 60) {
          setOffset(SWIPE_ACTIONS_WIDTH);
          haptic('light');
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
    <Box sx={{ position: 'relative', mb: '6px', borderRadius: '14px', height: '72px', overflow: 'hidden', bgcolor: 'action.hover' }}>
      {offset > 0 && (
        <Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: SWIPE_ACTIONS_WIDTH, display: 'flex', flexDirection: 'row-reverse' }}>
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
      )}
      {offset > 0 && offset < SWIPE_ACTIONS_WIDTH && (
        <Box sx={{
          position: 'absolute',
          right: offset - 30,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '20px',
          opacity: Math.min(offset / 60, 1),
          pointerEvents: 'none'
        }}>➤</Box>
      )}
      <Box
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
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          bgcolor: isPurchased ? 'action.disabledBackground' : 'background.paper',
          px: '14px',
          borderRadius: '14px',
          border: '1px solid',
          borderColor: 'divider',
          transform: `translateX(-${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
          boxShadow: offset > 0 ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <Box sx={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          bgcolor: isPurchased ? 'action.hover' : 'warning.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          transition: 'transform 0.2s ease'
        }}>{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: isPurchased ? 'text.secondary' : 'text.primary', textDecoration: isPurchased ? 'line-through' : 'none' }}>
            {product.name}
          </Typography>
          <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
            {product.quantity} {product.unit} • {product.addedBy}
          </Typography>
        </Box>
        {isPurchased && <Box component="span" sx={{ fontSize: '20px' }}>✅</Box>}
      </Box>
    </Box>
  );
}
