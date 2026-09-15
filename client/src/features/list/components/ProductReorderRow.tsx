import { memo } from 'react';
import { createPortal } from 'react-dom';
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
  translateY: number;
  rowRef: (el: HTMLDivElement | null) => void;
  onRowTouch: (e: React.TouchEvent) => void;
  onRowMouse: (e: React.MouseEvent) => void;
  // fixed-position data (נדרש רק כשגוררים - כדי לצאת מ-overflow clipping)
  dragFixedTop?: number;
  dragContainerLeft?: number;
  dragContainerWidth?: number;
}

export const ProductReorderRow = memo(({ product, index, isDragging, translateY, rowRef, onRowTouch, onRowMouse, dragFixedTop = 0, dragContainerLeft = 0, dragContainerWidth = 300 }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const icon = CATEGORY_ICONS[product.category as ProductCategory] || '📦';
  const color = CATEGORY_COLORS[product.category as keyof typeof CATEGORY_COLORS] || '#6B7280';

  const rowContent = (
    <>
      <Box aria-hidden="true" sx={{
        flexShrink: 0, mr: -0.25,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isDragging ? 'primary.main' : 'text.disabled',
      }}>
        <DragIndicatorRoundedIcon />
      </Box>

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
    </>
  );

  const sharedSx = {
    display: 'flex', alignItems: 'center', gap: 1.25,
    px: '12px', height: 64,
    borderRadius: '14px',
    border: '1px solid',
    borderColor: isDragging ? 'primary.main' : 'transparent',
    boxShadow: isDragging
      ? (isDark ? '0 16px 36px rgba(0,0,0,0.6)' : '0 16px 36px rgba(20,184,166,0.34)')
      : (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)'),
    scale: isDragging ? '1.045' : '1',
    rotate: isDragging ? '-1.3deg' : '0deg',
    // אחיד עם ListCard: action.hover כרקע בזמן גרירה (שקוף קצת, רואים מה מתחת)
    bgcolor: isDragging ? 'action.hover' : 'background.paper',
    opacity: isDragging ? 0.97 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'pan-y',
  };

  return (
    <>
      {/* השורה המקורית - *תמיד* נשארת מחוברת ל-DOM, גם בזמן גרירה (רק
          משנה מראה לפלייסהולדר מקווקו). קריטי: זה האלמנט שקיבל את
          touchstart - אם הוא היה מוסר מה-DOM תוך כדי המחווה (כמו שהיה
          בגרסה הקודמת, שהחליפה אותו באלמנט fixed נפרד ב-portal), ב-iOS
          Safari (ובדפדפנים נוספים) ה-touchmove/touchend הבאים על אותה
          מחווה פשוט מפסיקים להיזרק לגמרי - בדיוק התחושה של "נתקע ולא זז
          בכלל" מיד בתחילת הגרירה. */}
      <Box
        ref={rowRef}
        data-reorder-index={index}
        onTouchStart={onRowTouch}
        onMouseDown={onRowMouse}
        sx={isDragging ? {
          height: 64, mb: '6px', borderRadius: '14px',
          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
          border: '1px dashed', borderColor: 'divider',
        } : {
          ...sharedSx,
          mb: '6px',
          position: 'relative',
          transform: `translateY(${translateY}px)`,
          zIndex: 1,
          willChange: 'transform',
          transition: 'transform 0.22s cubic-bezier(0.34,1.25,0.64,1), scale 0.18s ease, rotate 0.18s ease, box-shadow 0.2s ease, border-color 0.12s ease',
        }}
      >
        {!isDragging && rowContent}
      </Box>

      {/* "רוח רפאים" ויזואלית בלבד - עוקבת אחרי האצבע. אלמנט חדש לגמרי,
          בלי מאזיני מגע - הגרירה כבר מנוהלת דרך listener-ים על document. */}
      {isDragging && createPortal(
        <Box
          aria-hidden="true"
          sx={{
            ...sharedSx,
            position: 'fixed',
            top: dragFixedTop + translateY,
            left: dragContainerLeft + 12,
            width: dragContainerWidth - 24,
            zIndex: 1400,
            transform: 'none',
            pointerEvents: 'none',
            transition: 'scale 0.15s cubic-bezier(0.34,1.4,0.64,1), rotate 0.15s ease, box-shadow 0.16s ease, border-color 0.12s ease',
          }}
        >
          {rowContent}
        </Box>,
        document.body,
      )}
    </>
  );
});
ProductReorderRow.displayName = 'ProductReorderRow';
