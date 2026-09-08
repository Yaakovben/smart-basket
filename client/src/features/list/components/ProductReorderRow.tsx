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
  // הזזה אנכית (px) - translateY רציף לשורה הנגררת (עוקב אחרי האצבע),
  // או קפיצה של גובה-שורה אחד לשורות שכנות שמתפנות מקום (ראו
  // useProductReorder.getRowShift).
  translateY: number;
  rowRef: (el: HTMLDivElement | null) => void;
  // גרירה מתחילה מ*כל* מקום בשורה (long-press), לא רק מהידית - יותר סלחני
  // ומרגיש מיידי. הידית נשארת כרמז ויזואלי.
  onRowTouch: (e: React.TouchEvent) => void;
  onRowMouse: (e: React.MouseEvent) => void;
}

// שורת מוצר במצב "סידור מחדש" - פשוטה ונקייה, בלי מחוות ההחלקה של
// SwipeItem. long-press על השורה מתחיל גרירה.
export const ProductReorderRow = memo(({ product, index, isDragging, translateY, rowRef, onRowTouch, onRowMouse }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const icon = CATEGORY_ICONS[product.category as ProductCategory] || '📦';
  const color = CATEGORY_COLORS[product.category as keyof typeof CATEGORY_COLORS] || '#6B7280';

  return (
    <Box
      ref={rowRef}
      data-reorder-index={index}
      onTouchStart={onRowTouch}
      onMouseDown={onRowMouse}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        mb: '6px', px: '12px', height: 64,
        borderRadius: '14px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'transparent',
        boxShadow: isDragging
          ? (isDark ? '0 12px 30px rgba(0,0,0,0.55)' : '0 12px 30px rgba(20,184,166,0.3)')
          : (isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)'),
        transform: `translateY(${translateY}px)${isDragging ? ' scale(1.03)' : ''}`,
        opacity: isDragging ? 0.97 : 1,
        // בלי transition על transform בשורה הנגררת - היא חייבת לעקוב אחרי
        // האצבע מיידית, בלי עיכוב. שורות שכנות כן מקבלות transition, כדי
        // שההזזה שלהן (לפנות מקום) תיראה חלקה ולא קפיצה.
        transition: isDragging
          ? 'box-shadow 0.16s ease, border-color 0.12s ease'
          : 'transform 0.2s cubic-bezier(0.2,0,0,1), box-shadow 0.16s ease, border-color 0.12s ease',
        position: 'relative',
        zIndex: isDragging ? 5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        // חוסם את מחוות הגלילה של הדפדפן על השורה עצמה בזמן גרירה פעילה;
        // בשלב pending הגלילה עדיין עובדת (ראו useProductReorder).
        touchAction: 'pan-y',
        userSelect: 'none', WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
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

      {/* ידית גרירה - רמז ויזואלי בלבד (הגרירה מתחילה מכל השורה) */}
      <Box aria-hidden="true" sx={{
        flexShrink: 0, px: 0.5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isDragging ? 'primary.main' : 'text.disabled',
      }}>
        <DragIndicatorRoundedIcon />
      </Box>
    </Box>
  );
});
ProductReorderRow.displayName = 'ProductReorderRow';
