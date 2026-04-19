import { memo } from 'react';
import { Box, Fab } from '@mui/material';
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

  // מיקום FAB מגרירה רלוונטי רק במצב FAB עגול, לא בכפתור רגיל
  const useCustomPosition = isDraggable && fabPosition;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: useCustomPosition ? undefined : 'calc(24px + env(safe-area-inset-bottom))',
        left: useCustomPosition ? undefined : '50%',
        transform: useCustomPosition ? undefined : 'translateX(-50%)',
        top: useCustomPosition ? fabPosition.y - 28 : undefined,
        right: useCustomPosition ? window.innerWidth - fabPosition.x - 28 : undefined,
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
        <Fab
          color="primary"
          variant="extended"
          onClick={handleClick}
          aria-label={t('addProduct')}
          sx={{
            px: 2.5,
            gap: 0.75,
            fontWeight: 600,
            fontSize: 14,
            textTransform: 'none',
            boxShadow: '0 6px 20px rgba(20, 184, 166, 0.4)',
          }}
        >
          <AddIcon sx={{ fontSize: 20 }} />
          {t('addProduct')}
        </Fab>
      )}
    </Box>
  );
});

AddProductFab.displayName = 'AddProductFab';
