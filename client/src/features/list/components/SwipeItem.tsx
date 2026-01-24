import { useState, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import type { Product } from '../../../global/types';
import { haptic, CATEGORY_ICONS, SWIPE_ACTIONS_WIDTH } from '../../../global/helpers';

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

const actionBtnSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0.5,
  color: 'white',
  fontSize: 18,
  cursor: 'pointer'
};

export const SwipeItem = ({ product, onToggle, onEdit, onDelete, onClick, isPurchased, isOpen, onOpen, onClose }: SwipeItemProps) => {
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
      const dx = e.touches[0].clientX - startX.current;
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
    <Box sx={{ position: 'relative', mb: 1.25, borderRadius: 3.5, height: 72, overflow: 'hidden', bgcolor: '#F3F4F6' }}>
      {offset > 0 && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: SWIPE_ACTIONS_WIDTH, display: 'flex' }}>
          <Box onClick={() => { haptic('light'); doAction(onToggle); }} sx={{ ...actionBtnSx, bgcolor: isPurchased ? 'warning.main' : 'success.main' }}>
            <span>{isPurchased ? '↩️' : '✓'}</span>
            <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{isPurchased ? 'החזר' : 'נקנה'}</Typography>
          </Box>
          <Box onClick={() => { haptic('light'); doAction(onEdit); }} sx={{ ...actionBtnSx, bgcolor: 'primary.main' }}>
            <span>✏️</span>
            <Typography sx={{ fontSize: 11, fontWeight: 600 }}>ערוך</Typography>
          </Box>
          <Box onClick={() => { haptic('medium'); doAction(onDelete); }} sx={{ ...actionBtnSx, bgcolor: 'error.main' }}>
            <span>🗑️</span>
            <Typography sx={{ fontSize: 11, fontWeight: 600 }}>מחק</Typography>
          </Box>
        </Box>
      )}
      {offset > 0 && offset < SWIPE_ACTIONS_WIDTH && (
        <Box sx={{
          position: 'absolute',
          left: offset - 30,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 20,
          opacity: Math.min(offset / 60, 1),
          pointerEvents: 'none'
        }}>◄</Box>
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
          gap: 1.5,
          bgcolor: isPurchased ? '#FAFAFA' : 'white',
          px: 1.75,
          borderRadius: 3.5,
          border: '1px solid #E5E7EB',
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
          boxShadow: offset > 0 ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <Box sx={{
          width: 44,
          height: 44,
          borderRadius: 3,
          bgcolor: isPurchased ? '#F3F4F6' : '#FEF3C7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          transition: 'transform 0.2s ease'
        }}>{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: isPurchased ? '#9CA3AF' : '#111827', textDecoration: isPurchased ? 'line-through' : 'none' }}>
            {product.name}
          </Typography>
          <Typography sx={{ fontSize: 13, color: '#9CA3AF' }}>
            {product.quantity} {product.unit} • {product.addedBy}
          </Typography>
        </Box>
        {isPurchased && <Box component="span" sx={{ fontSize: 20 }}>✅</Box>}
      </Box>
    </Box>
  );
}
