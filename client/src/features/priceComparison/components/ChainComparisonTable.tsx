/**
 * ChainComparisonTable - תצוגה השוואתית של מחיר הסל בכל הרשתות.
 *
 * חוקים הוגנים:
 * - "הכי זול" ניתן רק לרשת עם סל שלם (מקסימום מוצרים זוהו). רשת שמצאה פחות
 *   לא תקבל הכי זול גם אם הסה"כ נמוך.
 * - רשתות חלקיות מוצגות בצבע מעומעם עם הודעה "חסר X מוצרים" כדי שהמשתמש
 *   יבין למה הן לא מדרוג.
 *
 * אינטראקציה:
 * - לחיצה על רשת פותחת את הפירוט של כל המוצרים והמחירים באותה רשת.
 */

import { memo, useState } from 'react';
import { Box, Typography, Collapse, keyframes } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { PriceChainTotal, PriceMatch } from '../types/priceComparison.types';
import { useSettings } from '../../../global/context/SettingsContext';

interface Props {
  chainTotals: PriceChainTotal[];
}

const shimmer = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

// שורה בודדת של מוצר בתוך הפירוט של רשת.
// isCheapestInChain מוסיף badge "הכי זול ברשת" - משמש ל-3 הזולים בפירוט.
const ChainProductRow = memo(({ m, isDark, isCheapestInChain }: { m: PriceMatch; isDark?: boolean; isCheapestInChain?: boolean }) => {
  const subtotal = m.price * m.userQuantity;
  if (!m.matched) {
    // לא זוהה ברשת זו
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        py: 0.85, px: 1.25,
        borderRadius: '8px',
        bgcolor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
        border: '1px dashed',
        borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.25)',
      }}>
        <HelpOutlineIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
        <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
          {m.userProductName}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: '#F59E0B', fontWeight: 700 }}>
          לא זוהה
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1,
      py: 0.85, px: 1.25,
      borderRadius: '8px',
      bgcolor: isCheapestInChain
        ? (isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)')
        : (isDark ? 'rgba(20,184,166,0.05)' : 'rgba(20,184,166,0.03)'),
      border: isCheapestInChain ? '1px solid rgba(16,185,129,0.35)' : 'none',
    }}>
      <CheckCircleIcon sx={{ fontSize: 14, color: isCheapestInChain ? '#059669' : '#14B8A6', flexShrink: 0, mt: 0.2 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
            {m.userProductName}
          </Typography>
          {isCheapestInChain && (
            <Box sx={{
              px: 0.6, py: 0.1, borderRadius: '4px',
              bgcolor: '#10B981', color: 'white',
              fontSize: 9, fontWeight: 800, letterSpacing: 0.3,
            }}>
              זול
            </Box>
          )}
        </Box>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.3, mt: 0.15 }}>
          {m.itemName}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0D9488', fontFamily: 'monospace', lineHeight: 1.1 }}>
          ₪{subtotal.toFixed(2)}
        </Typography>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: 'monospace', mt: 0.15 }}>
          {m.userQuantity > 1 ? `${m.userQuantity} × ` : ''}₪{m.price.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );
});
ChainProductRow.displayName = 'ChainProductRow';

export const ChainComparisonTable = memo(({ chainTotals }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (chainTotals.length === 0) return null;

  // מציגים את כל הרשתות במאגר - גם אלו שלא מצאו אף התאמה (שקוף למשתמש שחיפשנו שם).
  // הסדר: שלמות מהזולה ליקרה, חלקיות, ולבסוף רשתות ריקות.
  const allChains = chainTotals;
  const chainsWithData = chainTotals.filter(c => c.matchedCount > 0);
  // המקסימום של מוצרים זוהו - משמש כסף ל"סל שלם"
  const maxMatched = chainsWithData.length > 0
    ? Math.max(...chainsWithData.map(c => c.matchedCount))
    : 0;
  const completeChains = chainsWithData.filter(c => c.isComplete);
  const maxSavings = completeChains.length > 1
    ? Math.max(...completeChains.map(c => c.savings))
    : 0;

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
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1.25,
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
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            px: 1, py: 0.3, borderRadius: '8px',
            bgcolor: '#10B98122', color: '#059669',
            fontSize: 11, fontWeight: 700,
          }}>
            <TrendingDownIcon sx={{ fontSize: 13 }} />
            חיסכון עד ₪{maxSavings.toFixed(0)}
          </Box>
        )}
      </Box>

      {/* הסבר — מופיע רק אם יש רשתות חלקיות */}
      {chainsWithData.some(c => !c.isComplete) && (
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', gap: 0.75,
          px: 2, py: 1,
          bgcolor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.05)',
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.15)',
        }}>
          <WarningAmberIcon sx={{ fontSize: 15, color: '#F59E0B', flexShrink: 0, mt: 0.2 }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.5 }}>
            רק רשתות שמצאו את כל <b>{maxMatched}</b> המוצרים מדורגות להשוואה הוגנת.
            רשתות עם פחות התאמות מוצגות בסוף.
          </Typography>
        </Box>
      )}

      {/* רשימת רשתות - כולל רשתות ללא התאמות (שם מאגר עדיין קיים) */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {allChains.map((chain) => {
          const isCheapest = chain.isCheapest;
          const isComplete = chain.isComplete;
          const isEmpty = chain.matchedCount === 0;
          const isExpanded = expandedId === chain.chainId;

          return (
            <Box key={chain.chainId} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
              {/* שורת סיכום - לחיצה פותחת פירוט */}
              <Box
                onClick={() => setExpandedId(prev => prev === chain.chainId ? null : chain.chainId)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.25,
                  cursor: 'pointer',
                  position: 'relative',
                  userSelect: 'none',
                  bgcolor: isCheapest
                    ? (isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)')
                    : isEmpty
                      ? (isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)')
                    : !isComplete
                      ? (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)')
                      : 'transparent',
                  // רשת ריקה - עוד יותר שקופה; חלקית - בינונית; שלמה - מלאה
                  opacity: isEmpty ? 0.55 : isComplete ? 1 : 0.72,
                  '&:active': { opacity: 0.85 },
                  transition: 'background-color 0.15s',
                }}
              >
                {/* פס ירוק לזולה ביותר */}
                {isCheapest && (
                  <Box sx={{
                    position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0,
                    width: 3,
                    background: 'linear-gradient(180deg, #10B981, #059669)',
                    animation: `${shimmer} 3s ease-in-out infinite`,
                    backgroundSize: '100% 200%',
                  }} />
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: isCheapest ? 800 : 600, color: 'text.primary' }}>
                      {chain.chainName}
                    </Typography>
                    {isCheapest && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: '#10B981', color: 'white',
                        fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
                      }}>
                        הכי זול
                      </Box>
                    )}
                    {isEmpty && !chain.hasData && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: '#F59E0B22', color: '#B45309',
                        fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
                      }}>
                        אין נתונים היום
                      </Box>
                    )}
                    {isEmpty && chain.hasData && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        color: 'text.disabled',
                        fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
                      }}>
                        אין התאמות
                      </Box>
                    )}
                    {!isComplete && !isEmpty && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: '#F59E0B22', color: '#F59E0B',
                        fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
                      }}>
                        חסר {maxMatched - chain.matchedCount} מוצרים
                      </Box>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.15 }}>
                    {isEmpty && !chain.hasData
                      ? `${chain.chainName} לא פרסמה מחירים היום - ננסה שוב בקרוב`
                      : isEmpty
                        ? `לא נמצאו התאמות במאגר של ${chain.chainName}`
                        : `${chain.matchedCount} / ${chain.matchedCount + chain.unmatchedCount} מוצרים זוהו`}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'end' }}>
                  <Typography sx={{
                    fontSize: 17, fontWeight: 800,
                    color: isCheapest ? '#059669' : 'text.primary',
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    ₪{chain.total.toFixed(0)}
                  </Typography>
                  {chain.savings > 0 && !isCheapest && isComplete && (
                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.15, fontVariantNumeric: 'tabular-nums' }}>
                      +₪{chain.savings.toFixed(0)}
                    </Typography>
                  )}
                </Box>

                <ExpandMoreIcon sx={{
                  fontSize: 20, color: 'text.disabled',
                  transition: 'transform 0.2s',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }} />
              </Box>

              {/* פירוט המוצרים - מתרחב בלחיצה.
                  מיון: קודם מוצרים שזוהו מהזול ליקר (לפי מחיר יחידה), אחר כך לא זוהו.
                  3 הזולים ביותר מקבלים badge "הכי זול ברשת". */}
              <Collapse in={isExpanded} timeout={200} unmountOnExit>
                <Box sx={{
                  px: 1.25, py: 1.25,
                  display: 'flex', flexDirection: 'column', gap: 0.5,
                  bgcolor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.015)',
                }}>
                  {(() => {
                    const matched = [...chain.matches].filter(m => m.matched).sort((a, b) => a.price - b.price);
                    const unmatched = chain.matches.filter(m => !m.matched);
                    const cheapestIds = new Set(matched.slice(0, 3).map(m => m.productId));
                    return (
                      <>
                        {matched.length > 0 && (
                          <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#0D9488', px: 0.5, mb: 0.25, letterSpacing: 0.5 }}>
                            הזולים ביותר ברשת
                          </Typography>
                        )}
                        {matched.map(m => (
                          <ChainProductRow
                            key={m.productId}
                            m={m}
                            isDark={isDark}
                            isCheapestInChain={cheapestIds.has(m.productId)}
                          />
                        ))}
                        {unmatched.length > 0 && (
                          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', px: 0.5, mt: matched.length > 0 ? 0.75 : 0, mb: 0.25 }}>
                            לא זוהו ({unmatched.length})
                          </Typography>
                        )}
                        {unmatched.map(m => (
                          <ChainProductRow key={m.productId} m={m} isDark={isDark} />
                        ))}
                      </>
                    );
                  })()}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
});

ChainComparisonTable.displayName = 'ChainComparisonTable';
