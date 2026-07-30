import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import type { PriceMatch } from '../types/priceComparison.types';

interface ProductRowProps {
  match: PriceMatch;
  isDark: boolean;
  // נתוני השוואה חוצת-רשתות - אופציונלי, מוצג רק כשיש מידע
  cheapestPrice?: number;
  mostExpensivePrice?: number;
}

// שורת מוצר בתוך כרטיס מורחב - שם + מחיר + אינדיקטור "הכי זול"
export const ProductRow = memo(({ match, isDark, cheapestPrice, mostExpensivePrice }: ProductRowProps) => {
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
  const showIdentifiedAs = match.itemName && match.itemName.trim().toLowerCase() !== match.userProductName.trim().toLowerCase();

  // חישוב מצב מחיר: הכי זול, הכי יקר, או אמצע
  const isCheapest = cheapestPrice !== undefined && Math.abs(match.price - cheapestPrice) < 0.01;
  const isMostExpensive = mostExpensivePrice !== undefined && Math.abs(match.price - mostExpensivePrice) < 0.01 && mostExpensivePrice > cheapestPrice!;
  const hasComparison = cheapestPrice !== undefined && mostExpensivePrice !== undefined && mostExpensivePrice > cheapestPrice;

  // אחוז חיסכון אפשרי (כמה יותר יקר מהזול)
  const savingsPct = hasComparison && !isCheapest
    ? Math.round(((match.price - cheapestPrice!) / cheapestPrice!) * 100)
    : 0;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.65, px: 1,
      borderRadius: '8px',
      bgcolor: isCheapest
        ? (isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)')
        : 'transparent',
      transition: 'background-color 0.15s',
    }}>
      {/* נקודת מצב */}
      <Box sx={{
        width: 6, height: 6, borderRadius: '50%',
        bgcolor: isCheapest ? '#10B981' : (isMostExpensive ? '#EF4444' : '#94A3B8'),
        flexShrink: 0, mt: 0.65,
        boxShadow: isCheapest ? '0 0 4px rgba(16,185,129,0.4)' : 'none',
      }} />

      {/* שם המוצר */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 12.5, fontWeight: 600, color: 'text.primary',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
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

      {/* מחיר + תג השוואה */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 0.2 }}>
        <Typography sx={{
          fontSize: 13, fontWeight: 800,
          color: isCheapest ? '#059669' : (isMostExpensive ? '#DC2626' : '#0F766E'),
          fontVariantNumeric: 'tabular-nums',
        }}>
          ₪{match.price.toFixed(2)}
        </Typography>
        {/* תג השוואה - הכי זול / +X% */}
        {isCheapest && hasComparison && (
          <Box sx={{
            px: 0.6, py: 0.1, borderRadius: '4px',
            bgcolor: '#10B981', color: 'white',
            fontSize: 8.5, fontWeight: 800, lineHeight: 1.2, letterSpacing: 0.2,
          }}>
            הכי זול
          </Box>
        )}
        {!isCheapest && savingsPct > 0 && (
          <Typography sx={{ fontSize: 9, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
            +{savingsPct}%
          </Typography>
        )}
      </Box>
    </Box>
  );
});
ProductRow.displayName = 'ProductRow';
