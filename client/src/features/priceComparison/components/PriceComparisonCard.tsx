/**
 * PriceComparisonCard — תצוגה ראשית של השוואת מחירים.
 *
 * גישה חדשה: התמקדות ברשתות (לא ברשימות של המשתמש).
 * המשתמש רואה בבת אחת את כל הרשתות ממוינות מהזולה ליקרה,
 * ולחיצה על כל רשת פותחת את פירוט המוצרים והמחירים שלה.
 */

import { memo } from 'react';
import { Box, Typography, Paper, Link, keyframes } from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import InventoryIcon from '@mui/icons-material/Inventory2';
import SavingsIcon from '@mui/icons-material/Savings';
import type { PriceComparisonData } from '../types/priceComparison.types';
import { BetaBadge } from './BetaBadge';
import { ChainComparisonTable } from './ChainComparisonTable';

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;

interface Props {
  data: PriceComparisonData | null;
  loading?: boolean;
  isDark?: boolean;
}

const formatRelative = (iso: string | null): string => {
  if (!iso) return 'לא ידוע';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'זה עתה';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `לפני ${mins || 1} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
};

export const PriceComparisonCard = memo(({ data, loading, isDark }: Props) => {
  if (loading || !data) return null;

  const freshness = formatRelative(data.lastUpdatedISO);
  const hasChainData = data.chainTotals?.some(c => c.matchedCount > 0) ?? false;
  const hasAnyPendingItems = data.totalPending > 0;

  // הזולה ביותר וחיסכון - לתצוגת ה-hero
  const cheapest = data.chainTotals?.find(c => c.isCheapest);
  const completeChains = data.chainTotals?.filter(c => c.isComplete && c.matchedCount > 0) ?? [];
  const maxTotal = completeChains.length > 1
    ? Math.max(...completeChains.map(c => c.total))
    : 0;
  const savings = cheapest && maxTotal > cheapest.total ? maxTotal - cheapest.total : 0;

  return (
    <Paper
      sx={{
        p: 2, borderRadius: '18px', mb: 2,
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.2)' : 'rgba(20,184,166,0.15)',
        background: isDark
          ? 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(20,184,166,0.02) 60%)'
          : 'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(20,184,166,0.01) 60%)',
        animation: `${fadeIn} 0.5s ease 0.45s both`,
      }}
      elevation={0}
    >
      {/* כותרת */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>🛒 השוואת מחירים</Typography>
        <BetaBadge size="sm" />
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25, lineHeight: 1.5 }}>
        הסל שלך נבדק ב-{data.chainTotals?.length ?? 0} רשתות. הרשת הזולה ביותר מסומנת. לחץ על רשת כדי לראות את המחירים בפירוט.
      </Typography>

      {/* מקור + טריות */}
      <Box sx={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.25,
        p: 1, borderRadius: '8px',
        bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <InventoryIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.primary' }}>
            מאגר השקיפות הממשלתי
          </Typography>
          {data.totalPrices > 0 && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              · {data.totalPrices.toLocaleString('he-IL')} מחירים
            </Typography>
          )}
        </Box>
        {data.lastUpdatedISO && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, ml: 'auto' }}>
            <UpdateIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>עודכן {freshness}</Typography>
          </Box>
        )}
      </Box>

      {/* מצבים ריקים */}
      {!data.enabled && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.6 }}>
            ⏳ המאגר עדיין לא נטען. ייבוא ראשוני יתבצע בקרוב.
          </Typography>
        </Box>
      )}

      {data.enabled && !hasAnyPendingItems && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
            אין כרגע פריטים שטרם נקנו ברשימות שלך. הוסף מוצרים כדי לראות השוואה.
          </Typography>
        </Box>
      )}

      {data.enabled && hasAnyPendingItems && !hasChainData && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.6 }}>
            לא הצלחנו לזהות אף אחד מהמוצרים שלך במאגר. נסה שמות מדויקים יותר (למשל "חלב תנובה 3%" במקום "חלב").
          </Typography>
        </Box>
      )}

      {/* Hero: הזולה ביותר + חיסכון - מוצג רק אם יש לפחות רשת שלמה אחת */}
      {hasChainData && cheapest && (
        <Box sx={{
          mb: 1.25, p: 1.75, borderRadius: '14px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
          color: 'white',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.18)',
            }}>
              <SavingsIcon sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.9, letterSpacing: 0.5 }}>
                הסל הזול ביותר
              </Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 900, lineHeight: 1.2, mt: 0.15 }}>
                {cheapest.chainName}
              </Typography>
              <Typography sx={{ fontSize: 11, opacity: 0.85, mt: 0.2 }}>
                {cheapest.matchedCount} מוצרים זוהו
                {savings > 0 && ` · חיסכון ₪${savings.toFixed(0)} לעומת היקר ביותר`}
              </Typography>
            </Box>
            <Typography sx={{
              fontSize: 26, fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              ₪{cheapest.total.toFixed(0)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* הטבלה המרכזית - כל הרשתות, כולל אלה בלי התאמות */}
      {data.enabled && hasAnyPendingItems && data.chainTotals && data.chainTotals.length > 0 && (
        <ChainComparisonTable chainTotals={data.chainTotals} />
      )}

      {/* Footer */}
      <Box sx={{
        mt: 1.5, pt: 1.25,
        borderTop: '1px dashed',
        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', lineHeight: 1.5 }}>
          ההתאמה בין שמות המוצרים לרשתות מבוססת על חיפוש מילים - עשויה להיות לא מדויקת. מחירים מתעדכנים כל 6 שעות.
        </Typography>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.5 }}>
          מקור:{' '}
          <Link href={data.sourceUrl} target="_blank" rel="noopener" sx={{ color: '#0D9488', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            {data.sourceName} ↗
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
});

PriceComparisonCard.displayName = 'PriceComparisonCard';
