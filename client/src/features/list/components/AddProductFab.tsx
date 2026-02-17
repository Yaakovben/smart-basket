import { memo } from 'react';
import { Box, Fab, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import type { FabPosition } from '../types/list-types';

// ===== קבועים =====
const FAB_DRAGGABLE_THRESHOLD = 3;

// ===== Props =====
interface AddProductFabProps {
  itemCount: number;
  fabPosition: FabPosition | null;
  isDragging: boolean;
  onAddProduct: () => void;
  onDragStart: (clientX: number, clientY: number) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
}

// ===== קומפוננטה =====
export const AddProductFab = memo(({
  itemCount,
  fabPosition,
  isDragging,
  onAddProduct,
  onDragStart,
  onDragMove,
  onDragEnd
}: AddProductFabProps) => {
  const { t } = useSettings();
  const isDraggable = itemCount > FAB_DRAGGABLE_THRESHOLD;

  const handleClick = () => {
    if (!isDragging) {
      haptic('medium');
      onAddProduct();
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: fabPosition ? undefined : 'calc(70px + env(safe-area-inset-bottom))',
        left: fabPosition ? undefined : '50%',
        transform: fabPosition ? undefined : 'translateX(-50%)',
        top: fabPosition ? fabPosition.y - 28 : undefined,
        right: fabPosition ? window.innerWidth - fabPosition.x - 28 : undefined,
        zIndex: 5,
        touchAction: isDraggable ? 'none' : 'auto'
      }}
      onTouchStart={isDraggable ? (e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY) : undefined}
      onTouchMove={isDraggable ? (e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY) : undefined}
      onTouchEnd={isDraggable ? onDragEnd : undefined}
      onMouseDown={isDraggable ? (e) => onDragStart(e.clientX, e.clientY) : undefined}
      onMouseMove={isDraggable && isDragging ? (e) => onDragMove(e.clientX, e.clientY) : undefined}
      onMouseUp={isDraggable ? onDragEnd : undefined}
      onMouseLeave={isDraggable ? onDragEnd : undefined}
    >
      {isDraggable ? (
        <Fab
          color="primary"
          onClick={handleClick}
          aria-label={t('addProduct')}
          sx={{
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'all 0.2s ease',
            width: { xs: 52, sm: 56 },
            height: { xs: 52, sm: 56 }
          }}
        >
          <AddIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
        </Fab>
      ) : (
        <Button
          variant="contained"
          onClick={handleClick}
          aria-label={t('addProduct')}
          sx={{
            borderRadius: { xs: '14px', sm: '16px' },
            px: { xs: 2.5, sm: 3 },
            py: { xs: 1.25, sm: 1.5 },
            fontSize: { xs: 14, sm: 15 },
            fontWeight: 600,
            background: 'linear-gradient(135deg, #14B8A6, #10B981)',
            boxShadow: '0 8px 24px rgba(20, 184, 166, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            '&:hover': {
              background: 'linear-gradient(135deg, #0D9488, #059669)',
              boxShadow: '0 10px 28px rgba(20, 184, 166, 0.5)'
            }
          }}
        >
          <AddIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          <span>{t('addProduct')}</span>
        </Button>
      )}
    </Box>
  );
});

AddProductFab.displayName = 'AddProductFab';
