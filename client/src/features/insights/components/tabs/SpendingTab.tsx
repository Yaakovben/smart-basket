/**
 * SpendingTab - הטאב "הוצאות" של עמוד התובנות.
 * מציג הוצאה חודשית משוערת, פילוח לפי קטגוריה, וצפי לסוף החודש -
 * מבוסס על spending שכבר מחושב בשרת (server/api/src/services/spending.service.ts).
 */

import { memo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../../global/constants';
import {
  fadeIn, StatCard, HeroInsight, InsightsEmptyState, CategoryDonut,
} from '../insightsShared';

interface Props {
  data: InsightsData;
  isDark: boolean;
  t: (key: string) => string;
}

const formatILS = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;

export const SpendingTab = memo(({ data, isDark, t }: Props) => {
  const { spending } = data;

  if (!spending.enabled) {
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="🧾"
        floatingItems={['💰', '📊', '🛒', '📈']}
        title="מאגר המחירים עדיין לא נטען"
        description="ניתוח ההוצאות מבוסס על מאגר המחירים הממשלתי האמיתי. ברגע שהוא ייטען, כאן תראה כמה הוצאת החודש, על מה הכי הרבה, וכמה אתה צפוי להוציא."
      />
    );
  }

  if (spending.monthTotal === null) {
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="🧾"
        floatingItems={['💰', '📊', '🛒', '📈']}
        title="עדיין לא סימנת קניות החודש"
        description="ברגע שתסמן ✅ מוצרים שקנית, כאן יופיע ניתוח ההוצאות שלך - כמה הוצאת, על מה הכי הרבה, וכמה אתה צפוי להוציא עד סוף החודש."
      />
    );
  }

  const growth = spending.monthGrowthPct;
  const hasGrowth = spending.hasBaseline && growth !== null;
  const growthUp = hasGrowth && growth! > 0;
  const growthDown = hasGrowth && growth! < 0;
  // בהוצאות "עלייה" היא לא-רצויה ולהפך מ-PulseTab (שם עלייה בפעילות חיובית) -
  // לכן הצבעים הפוכים: יותר הוצאה = אדום, פחות הוצאה = ירוק.
  const growthColor = !hasGrowth ? '#94A3B8' : growthUp ? '#EF4444' : growthDown ? '#22C55E' : '#94A3B8';
  const GrowthIcon = growthUp ? TrendingUpIcon : growthDown ? TrendingDownIcon : TrendingFlatIcon;

  const donutItems = spending.categoryBreakdown.slice(0, 6).map(c => {
    const key = CATEGORY_TRANSLATION_KEYS[c.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
    return {
      category: c.category,
      count: c.amount,
      percentage: c.percentage,
      color: CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS] || '#6B7280',
      icon: CATEGORY_ICONS[c.category as keyof typeof CATEGORY_ICONS] || '📦',
      label: key ? t(key) : c.category,
    };
  });

  const topCategoryLabel = spending.topCategory
    ? (() => {
        const key = CATEGORY_TRANSLATION_KEYS[spending.topCategory!.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
        return key ? t(key) : spending.topCategory!.category;
      })()
    : null;
  const topCategoryIcon = spending.topCategory
    ? (CATEGORY_ICONS[spending.topCategory.category as keyof typeof CATEGORY_ICONS] || '📦')
    : null;

  const totalSeen = spending.monthMatchedCount + spending.monthUnmatchedCount;

  return (
    <>
      <HeroInsight
        icon="🧾"
        text={<>הוצאת כ-<b>{formatILS(spending.monthTotal)}</b> החודש</>}
        accent="#14B8A6"
        isDark={isDark}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
        <StatCard
          value={formatILS(spending.monthTotal)}
          label="הוצאה החודש"
          color="#14B8A6"
          bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
          border="rgba(20,184,166,0.15)"
        />
        <StatCard
          value={spending.projectedMonthTotal !== null ? formatILS(spending.projectedMonthTotal) : '—'}
          label="צפי לסוף החודש"
          color="#0D9488"
          bg={isDark ? 'rgba(13,148,136,0.08)' : 'rgba(13,148,136,0.05)'}
          border="rgba(13,148,136,0.15)"
        />
        <Paper elevation={0} sx={{
          p: 1.5, borderRadius: '14px', textAlign: 'center',
          bgcolor: isDark ? `${growthColor}14` : `${growthColor}0D`,
          border: `1.5px solid ${growthColor}26`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
            <GrowthIcon sx={{ fontSize: 16, color: growthColor }} />
            <Typography sx={{ fontSize: 15, fontWeight: 900, color: growthColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {!hasGrowth ? '—' : `${growth! > 0 ? '+' : ''}${growth}%`}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 700, mt: 0.5, letterSpacing: 0.3 }}>
            לעומת חודש שעבר
          </Typography>
        </Paper>
      </Box>

      {spending.topCategory && topCategoryLabel && (
        <Box sx={{
          mb: 2, p: 1.5, borderRadius: '14px',
          background: 'linear-gradient(135deg, #F59E0B, #DC2626)',
          color: 'white',
          display: 'flex', alignItems: 'center', gap: 1.25,
          boxShadow: '0 4px 14px rgba(220,38,38,0.28)',
          animation: `${fadeIn} 0.45s ease 0.1s both`,
        }}>
          <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{topCategoryIcon}</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.4 }}>
              הכי הרבה הוצאת על
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, mt: 0.15 }}>
              {topCategoryLabel}
            </Typography>
            <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.15 }}>
              {formatILS(spending.topCategory.amount)} · {spending.topCategory.percentage}% מההוצאה החודשית
            </Typography>
          </Box>
        </Box>
      )}

      {donutItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.25, color: isDark ? '#5EEAD4' : '#0F766E' }}>
            💸 פילוח הוצאה לפי קטגוריה
          </Typography>
          <CategoryDonut items={donutItems} isDark={isDark} />
        </Box>
      )}

      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.6, mt: 1 }}>
        {spending.disclaimer}
        {totalSeen > 0 && ` (זוהו ${spending.monthMatchedCount} מתוך ${totalSeen} פריטים)`}
      </Typography>
    </>
  );
});

SpendingTab.displayName = 'SpendingTab';
