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

  // מצב FAB עגול עם גרירה
  if (isDraggable) {
    return (
      <Box
        sx={{
          position: 'fixed',
          ...(fabPosition ? {
            top: fabPosition.y - 28,
            right: window.innerWidth - fabPosition.x - 28,
          } : {
            bottom: 'calc(24px + env(safe-area-inset-bottom))',
            left: 0, right: 0,
            display: 'flex', justifyContent: 'center',
            pointerEvents: 'none',
          }),
          zIndex: 5,
          touchAction: 'none',
          '& > *': { pointerEvents: 'auto' },
        }}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
        onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}
        onMouseMove={isDragging ? (e) => onDragMove(e.clientX, e.clientY) : undefined}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        <Fab
          color="primary"
          onClick={handleClick}
          aria-label={t('addProduct')}
          sx={{
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'all 0.2s ease',
            width: { xs: 52, sm: 56 },
            height: { xs: 52, sm: 56 },
          }}
        >
          <AddIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
        </Fab>
      </Box>
    );
  }

  // מצב כפתור רגיל - sticky בתוך ה-flow, לא fixed
  return (
    <Box sx={{
      position: 'sticky',
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      display: 'flex',
      justifyContent: 'center',
      py: 1,
      zIndex: 5,
      pointerEvents: 'none',
    }}>
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
          pointerEvents: 'auto',
        }}
      >
        <AddIcon sx={{ fontSize: 20 }} />
        {t('addProduct')}
      </Fab>
    </Box>
  );
});

AddProductFab.displayName = 'AddProductFab';
