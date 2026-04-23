/**
 * ChainComparisonTable - תצוגה השוואתית של מחיר הסל בכל הרשתות.
 * מציג רשימת רשתות ממוינת מהזולה ליקרה, עם highlight לזולה ביותר וחיסכון.
 */

import { memo } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { PriceChainTotal } from '../types/priceComparison.types';
import { useSettings } from '../../../global/context/SettingsContext';

interface Props {
  chainTotals: PriceChainTotal[];
}

const shimmer = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

export const ChainComparisonTable = memo(({ chainTotals }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  if (chainTotals.length === 0) return null;

  // מסננים רשתות בלי התאמות (total=0) לתצוגה — בסוף נזרוק אותן אם אין לא שום דבר להשוות
  const chainsWithData = chainTotals.filter(c => c.matchedCount > 0);
  if (chainsWithData.length === 0) return null;

  const cheapest = chainsWithData.find(c => c.isCheapest);
  const maxSavings = cheapest?.savings || 0;

  return (
    <Box
      sx={{
        borderRadius: '16px',
        bgcolor: isDark ? 'rgba(20,184,166,0.04)' : 'rgba(20,184,166,0.03)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.12)',
        overflow: 'hidden',
      }}
    >
      {/* כותרת */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        }}
      >
        <StorefrontIcon sx={{ fontSize: 18, color: '#14B8A6' }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', flex: 1 }}>
          השוואה בין רשתות
        </Typography>
        {maxSavings > 0 && (
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            px: 1,
            py: 0.3,
            borderRadius: '8px',
            bgcolor: '#10B98122',
            color: '#059669',
            fontSize: 11,
            fontWeight: 700,
          }}>
            <TrendingDownIcon sx={{ fontSize: 13 }} />
            חיסכון עד ₪{maxSavings.toFixed(0)}
          </Box>
        )}
      </Box>

      {/* רשימת רשתות */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {chainsWithData.map((chain) => {
          const isCheapest = chain.isCheapest;
          return (
            <Box
              key={chain.chainId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 'none' },
                bgcolor: isCheapest
                  ? (isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)')
                  : 'transparent',
                position: 'relative',
              }}
            >
              {/* מסומן ירוק — זולה ביותר */}
              {isCheapest && (
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  insetInlineStart: 0,
                  width: 3,
                  background: 'linear-gradient(180deg, #10B981, #059669)',
                  animation: `${shimmer} 3s ease-in-out infinite`,
                  backgroundSize: '100% 200%',
                }} />
              )}

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: isCheapest ? 800 : 600, color: 'text.primary' }}>
                    {chain.chainName}
                  </Typography>
                  {isCheapest && (
                    <Box sx={{
                      px: 0.75,
                      py: 0.15,
                      borderRadius: '6px',
                      bgcolor: '#10B981',
                      color: 'white',
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                    }}>
                      הכי זול
                    </Box>
                  )}
                </Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.15 }}>
                  {chain.matchedCount} מוצרים זוהו
                  {chain.unmatchedCount > 0 && ` · ${chain.unmatchedCount} לא זוהו`}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'end' }}>
                <Typography
                  sx={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: isCheapest ? '#059669' : 'text.primary',
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ₪{chain.total.toFixed(0)}
                </Typography>
                {chain.savings > 0 && !isCheapest && (
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.15, fontVariantNumeric: 'tabular-nums' }}>
                    +₪{chain.savings.toFixed(0)}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
});

ChainComparisonTable.displayName = 'ChainComparisonTable';
