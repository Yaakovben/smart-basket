import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import type { PriceMatch } from '../types/priceComparison.types';

// שורת מוצר בתוך כרטיס מורחב - שם + מחיר. אם לא נמצא: מוצג בעמום.
export const ProductRow = memo(({ match, isDark }: { match: PriceMatch; isDark: boolean }) => {
  if (!match.matched) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, py: 0.6, px: 1,
        borderRadius: '8px',
        bgcolor: isDark ? 'rgba(245,158,11,0.04)' : 'rgba(245,158,11,0.03)',
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F59E0B', opacity: 0.5, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12, color: 'text.secondary', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.userProductName}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: '#D97706', fontWeight: 700, flexShrink: 0 }}>
          לא נמצא
        </Typography>
      </Box>
    );
  }
  const subtotal = match.price * match.userQuantity;
  // אם השם של המוצר ברשת שונה מהשם שהמשתמש רשם - מציגים אותו כדי שהלקוח
  // יראה "זוהה כ: ..." ויוכל לוודא שההתאמה נכונה.
  const showIdentifiedAs = match.itemName && match.itemName.trim().toLowerCase() !== match.userProductName.trim().toLowerCase();
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.6, px: 1,
      borderRadius: '8px',
    }}>
      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981', flexShrink: 0, mt: 0.65 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.userProductName}
        </Typography>
        {showIdentifiedAs && (
          <Typography sx={{
            fontSize: 10, color: 'text.secondary', mt: 0.15, lineHeight: 1.35,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontStyle: 'italic',
          }}>
            זוהה כ: <Box component="span" sx={{ fontStyle: 'normal', fontWeight: 600, color: 'text.primary' }}>{match.itemName}</Box>
            {match.manufacturerName ? <> · {match.manufacturerName}</> : null}
          </Typography>
        )}
        {match.userQuantity > 1 && (
          <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: showIdentifiedAs ? 0.1 : 0 }}>
            ×{match.userQuantity} = ₪{subtotal.toFixed(2)}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0F766E', fontVariantNumeric: 'tabular-nums', flexShrink: 0, mt: 0.25 }}>
        ₪{match.price.toFixed(2)}
      </Typography>
    </Box>
  );
});
ProductRow.displayName = 'ProductRow';
