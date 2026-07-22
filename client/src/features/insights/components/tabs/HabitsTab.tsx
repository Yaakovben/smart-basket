import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS } from '../../../../global/constants';
import { haptic } from '../../../../global/helpers';
import {
  dayLabels, AnimatedNumber, StatCard, InsightsEmptyState,
  AchievementBadges, computeAchievements, ForgottenProductsCard,
  SpotlightProduct, SmartTipsCarousel, GoldenHourCard,
  MonthRecapCard, MonthVsMonthStrip, MilestoneProgress,
} from '../insightsShared';
import { HabitsTopProducts } from './HabitsTopProducts';
import { HabitsCategoryBreakdown } from './HabitsCategoryBreakdown';
import { HabitsCategoryCycles } from './HabitsCategoryCycles';

interface HabitsTabProps {
  data: InsightsData;
  isDark: boolean;
  onNavigateHome: () => void;
  t: (key: string) => string;
}

// טאב "הרגלים" של עמוד התובנות - הישגים, "החודש שלך", המוצרים הנפוצים,
// פילוח קטגוריות ומחזורי קנייה. הסקציות הכבדות חיות בקבצים נפרדים.
export const HabitsTab = memo(({ data, isDark, onNavigateHome, t }: HabitsTabProps) => {
  const { stats, topProducts, categoryBreakdown, categoryCycles, weekdayActivity } = data;

  // אין עדיין נתוני קניות - מסך ריק ברור במקום כרטיסי "0"
  const hasAnyActivity = stats.totalPurchased > 0 || topProducts.length > 0 || categoryBreakdown.length > 0;
  if (!hasAnyActivity) {
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="🛍️"
        floatingItems={['🥕', '🍞', '🥛', '🍎']}
        title="עוד לא סימנת מוצרים כנקנו"
        description="סמן ✅ על מוצרים שקנית, וכאן יופיעו הרגלי הקנייה שלך - מוצרים חוזרים, ימי שיא, קטגוריות מועדפות וכל מה שמספר עליך."
        tips={['מוצרים חוזרים', 'ימי השיא שלך', 'קטגוריות מועדפות']}
        ctaLabel="לרשימות שלי"
        ctaIcon={<HomeIcon sx={{ fontSize: 18 }} />}
        onCtaClick={() => { haptic('medium'); onNavigateHome(); }}
      />
    );
  }

  // הישגים - מחושבים מנתונים שכבר יש. שורת badges מאמירה ש"השגת
  // משהו", גורם הזדהות וגאווה. מוצג רק אם יש לפחות הישג אחד.
  const achievements = computeAchievements({
    totalPurchased: stats.totalPurchased,
    totalLists: stats.totalLists,
    currentWeeks: data.streaks?.currentWeeks ?? 0,
    longestWeeks: data.streaks?.longestWeeks ?? 0,
    completionRate: stats.completionRate,
    categoryCount: categoryBreakdown.length,
  });

  // המוצר הכי-נקנה לתצוגת Spotlight
  const heroProduct = topProducts[0];
  const heroProductIcon = heroProduct
    ? (CATEGORY_ICONS[heroProduct.category as keyof typeof CATEGORY_ICONS] || '🛒')
    : null;

  // חישובים לשורת הסטטיסטיקה העליונה
  const topCategory = categoryBreakdown[0];
  const topCategoryLabel = topCategory
    ? (CATEGORY_TRANSLATION_KEYS[topCategory.category as keyof typeof CATEGORY_TRANSLATION_KEYS]
        ? t(CATEGORY_TRANSLATION_KEYS[topCategory.category as keyof typeof CATEGORY_TRANSLATION_KEYS])
        : topCategory.category)
    : null;
  const maxWeekday = Math.max(...(weekdayActivity || []), 1);
  const bestDayIdx = weekdayActivity ? weekdayActivity.indexOf(maxWeekday) : -1;
  const bestDayLabel = bestDayIdx >= 0 ? dayLabels[bestDayIdx] : '—';

  // Recap slides - "החודש שלך" בסגנון Wrapped. נבנה רק עובדות אמיתיות.
  const recapSlides: { emoji: string; headline: React.ReactNode; sub: string; gradient: string }[] = [];
  const purchasedThisMonth = stats.totalPurchased; // שימוש כקירוב; נתון מדויק אין
  if (purchasedThisMonth > 0) recapSlides.push({
    emoji: '🛒',
    headline: <><b>{purchasedThisMonth}</b> פריטים נקנו</>,
    sub: 'סך הכל בחשבון שלך',
    gradient: 'linear-gradient(135deg, #14B8A6, #0D9488 60%, #0F766E)',
  });
  if (heroProduct && heroProduct.count >= 2) recapSlides.push({
    emoji: heroProductIcon || '⭐',
    headline: <>הכוכב: <b>{heroProduct.name}</b></>,
    sub: `קנית ${heroProduct.count} פעמים — האהוב`,
    gradient: 'linear-gradient(135deg, #F59E0B, #DC2626 70%)',
  });
  if (topCategory) recapSlides.push({
    emoji: CATEGORY_ICONS[topCategory.category as keyof typeof CATEGORY_ICONS] || '📊',
    headline: <><b>{topCategory.percentage}%</b> מהקניות</>,
    sub: `הקטגוריה ${topCategoryLabel} שולטת אצלך`,
    gradient: 'linear-gradient(135deg, #8B5CF6, #6366F1 60%, #4F46E5)',
  });
  if (stats.completionRate >= 50) recapSlides.push({
    emoji: stats.completionRate >= 80 ? '🏆' : '⚡',
    headline: <><b>{stats.completionRate}%</b> השלמה</>,
    sub: stats.completionRate >= 80 ? 'מצוין — יעיל ומדויק' : 'יפה, יש לאן להתקדם',
    gradient: 'linear-gradient(135deg, #10B981, #059669 70%)',
  });
  if ((data.streaks?.currentWeeks ?? 0) >= 2) recapSlides.push({
    emoji: '🔥',
    headline: <><b>{data.streaks!.currentWeeks}</b> שבועות רצוף</>,
    sub: 'בערך כל שבוע יש פעילות — סטריק חי',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626 60%, #991B1B)',
  });

  return (
    <>
      {/* "החודש שלך" Recap - סלייד-שואו מעורר השראה */}
      {recapSlides.length >= 2 && (
        <MonthRecapCard slides={recapSlides} isDark={isDark} />
      )}

      {/* Spotlight: המוצר המוביל - hero ענק וזוהר */}
      {heroProduct && heroProduct.count >= 3 && heroProductIcon && (
        <SpotlightProduct
          name={heroProduct.name}
          count={heroProduct.count}
          icon={heroProductIcon}
          isDark={isDark}
        />
      )}

      {/* שורת הישגים - מקור גאווה ויזואלי */}
      <AchievementBadges items={achievements} isDark={isDark} />

      {/* התקדמות להישג הבא - גורם הזדהות והכוונה */}
      <MilestoneProgress
        stats={{ totalPurchased: stats.totalPurchased, totalLists: stats.totalLists }}
        streaks={data.streaks}
        completionRate={stats.completionRate}
        isDark={isDark}
      />

      {/* חודש מול חודש - השוואה ויזואלית של פעילות */}
      <MonthVsMonthStrip
        thisMonth={data.monthComparison?.previousTotal !== undefined
          ? Math.max(0, (data.monthComparison.previousTotal || 0) + Math.round((data.monthComparison.previousTotal || 0) * (data.monthComparison.productsGrowth || 0) / 100))
          : 0}
        lastMonth={data.monthComparison?.previousTotal ?? 0}
        hasBaseline={data.monthComparison?.hasBaseline ?? false}
        isDark={isDark}
      />

      {/* טיפים חכמים מתחלפים - שימוש ב-smartTips שכבר מחושב בשרת */}
      {data.smartTips && data.smartTips.length > 0 && (
        <SmartTipsCarousel tips={data.smartTips} isDark={isDark} />
      )}

      {/* "השעה הזהובה" - מציג בוקר/צהריים/ערב/לילה לפי השעה השיא */}
      <GoldenHourCard hourlyActivity={data.hourlyActivity} isDark={isDark} />

      {/* כרטיס "אולי שכחת" - trigger רגשי שגורם להוסיף מוצרים נשכחים */}
      <ForgottenProductsCard items={data.forgotten || []} isDark={isDark} />

      {/* שורת סטטיסטיקת על */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.75 }}>
        <StatCard
          value={<AnimatedNumber value={stats.totalPurchased} />}
          label={'נקנו בסה"כ'}
          color="#14B8A6"
          bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
          border="rgba(20,184,166,0.15)"
        />
        <StatCard
          value={topCategoryLabel ? <Typography component="span" sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary' }}>{topCategoryLabel}</Typography> : '—'}
          label={topCategory ? `קטגוריה מובילה · ${topCategory.percentage}%` : 'קטגוריה מובילה'}
          color="#14B8A6"
          bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
          border="rgba(20,184,166,0.15)"
        />
        <StatCard
          value={bestDayLabel}
          label={`יום שיא${maxWeekday > 0 ? ` · ${maxWeekday} פעולות` : ''}`}
          color="#14B8A6"
          bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
          border="rgba(20,184,166,0.15)"
        />
      </Box>

      <HabitsTopProducts topProducts={topProducts} isDark={isDark} t={t} />
      <HabitsCategoryBreakdown categoryBreakdown={categoryBreakdown} isDark={isDark} t={t} />
      <HabitsCategoryCycles categoryCycles={categoryCycles} isDark={isDark} t={t} />
    </>
  );
});
HabitsTab.displayName = 'HabitsTab';
