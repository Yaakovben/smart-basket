import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import type { Product, ProductCategory } from '../../../global/types';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../../global/helpers';
import { cldThumb } from '../../../global/helpers/cloudinaryImage';
import { useSettings } from '../../../global/context/SettingsContext';

interface Props {
  product: Product;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  rowRef: (el: HTMLDivElement | null) => void;
  onHandleTouch: (e: React.TouchEvent) => void;
  onHandleMouse: (e: React.MouseEvent) => void;
}

// שורת מוצר במצב "סידור מחדש" - פשוטה ונקייה, בלי מחוות ההחלקה של
// SwipeItem. גרירה מתחילה מהידית (long-press), כמו סידור רשימות בבית.
export const ProductReorderRow = memo(({ product, index, isDragging, isDragOver, rowRef, onHandleTouch, onHandleMouse }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const icon = CATEGORY_ICONS[product.category as ProductCategory] || '📦';
  const color = CATEGORY_COLORS[product.category as keyof typeof CATEGORY_COLORS] || '#6B7280';

  return (
    <Box
      ref={rowRef}
      data-reorder-index={index}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        mb: '6px', px: '12px', height: 64,
        borderRadius: '14px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isDragOver ? 'primary.main' : 'transparent',
        boxShadow: isDragging
          ? (isDark ? '0 10px 28px rgba(0,0,0,0.5)' : '0 10px 28px rgba(20,184,166,0.28)')
          : (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)'),
        transform: isDragging ? 'scale(1.03)' : 'none',
        opacity: isDragging ? 0.97 : 1,
        transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.12s ease',
        position: 'relative',
        zIndex: isDragging ? 5 : 1,
        touchAction: 'pan-y',
      }}
    >
      {/* אייקון קטגוריה / תמונה */}
      {product.image ? (
        <Box
          component="img"
          src={cldThumb(product.image)}
          alt=""
          sx={{ width: 38, height: 38, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <Box sx={{
          width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          bgcolor: isDark ? `${color}33` : `${color}1F`,
        }}>
          {icon}
        </Box>
      )}

      {/* שם + כמות */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 15, fontWeight: 600, color: 'text.primary',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {product.name}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
          {product.quantity} {product.unit}
        </Typography>
      </Box>

      {/* ידית גרירה - כאן מתחילים long-press */}
      <Box
        role="button"
        aria-label="גרור לסידור מחדש"
        onTouchStart={onHandleTouch}
        onMouseDown={onHandleMouse}
        sx={{
          flexShrink: 0, px: 0.5, py: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDragging ? 'primary.main' : 'text.disabled',
          cursor: 'grab',
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIndicatorRoundedIcon />
      </Box>
    </Box>
  );
});
ProductReorderRow.displayName = 'ProductReorderRow';
