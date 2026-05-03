import { memo, useRef } from 'react';
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
  onDragStart: (clientX: number, clientY: number, currentCenterX?: number, currentCenterY?: number) => void;
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  // מדידת מרכז הכפתור בפועל לפי DOM - מונע קפיצה כשמתחילים לגרור מ-bottom-center למצב top/left
  const measureCenter = (): { x: number; y: number } | undefined => {
    const el = wrapperRef.current;
    if (!el) return undefined;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

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
        ref={wrapperRef}
        sx={{
          position: 'fixed',
          ...(fabPosition ? {
            top: fabPosition.y - 28,
            left: fabPosition.x - 28,
          } : {
            bottom: 'calc(24px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }),
          zIndex: 5,
          touchAction: 'none',
          '& > *': { pointerEvents: 'auto' },
        }}
        onTouchStart={(e) => { const c = measureCenter(); onDragStart(e.touches[0].clientX, e.touches[0].clientY, c?.x, c?.y); }}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
        onMouseDown={(e) => { const c = measureCenter(); onDragStart(e.clientX, e.clientY, c?.x, c?.y); }}
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

  // מצב מעט פריטים: FAB עגול קטן ללא טקסט (כפילות עם שדה ההוספה למעלה).
  // השוני היחיד מהמצב הראשון: הכפתור לא נגרר. שאר העיצוב זהה.
  return (
    <Box sx={{
      position: 'fixed',
      bottom: 'calc(24px + env(safe-area-inset-bottom))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 5,
    }}>
      <Fab
        color="primary"
        onClick={handleClick}
        aria-label={t('addProduct')}
        sx={{
          width: { xs: 52, sm: 56 },
          height: { xs: 52, sm: 56 },
          touchAction: 'manipulation',
        }}
      >
        <AddIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
      </Fab>
    </Box>
  );
});

AddProductFab.displayName = 'AddProductFab';
