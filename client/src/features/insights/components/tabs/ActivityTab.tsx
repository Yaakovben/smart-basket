import { memo } from 'react';
import HomeIcon from '@mui/icons-material/Home';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS } from '../../../../global/constants';
import { haptic } from '../../../../global/helpers';
import {
  HeroInsight, InsightsEmptyState, PersonalityCard, ActivityDotCalendar,
  AchievementBadges, computeAchievements, ForgottenProductsCard,
  SpotlightProduct, SmartTipsCarousel, MonthRecapCard, MilestoneProgress,
} from '../insightsShared';
import { HabitsTopProducts } from './HabitsTopProducts';
import { HabitsCategoryBreakdown } from './HabitsCategoryBreakdown';
import { HabitsCategoryCycles } from './HabitsCategoryCycles';
import { PulseMomentumCard } from './pulse/PulseMomentumCard';
import { PulseUpcomingNeeds } from './pulse/PulseUpcomingNeeds';
import { PulseAnomalies } from './pulse/PulseAnomalies';
import { PulseScoreCard } from './pulse/PulseScoreCard';
import { PulseStatsRow } from './pulse/PulseStatsRow';
import { PulsePredictionCard } from './pulse/PulsePredictionCard';
import { PulseWeeklyTrend } from './pulse/PulseWeeklyTrend';
import { PulseWeekdayHeatmap } from './pulse/PulseWeekdayHeatmap';
import { PulseHourlyActivity } from './pulse/PulseHourlyActivity';

/**
 * ActivityTab - טאב "פעילות" ממוזג של עמוד התובנות (איחוד "הרגלים" + "דופק").
 * הסקציות מסודרות בסדר סיפורי: זהות/ציון → הישגים → מוצרים/קטגוריות →
 * מגמות → תחזיות/התראות. כל כרטיס מחשב את הנתונים הנגזרים שלו בעצמו
 * מהנתונים הגולמיים, כדי לשמור את הקובץ הזה כאורקסטרטור דק.
 *
 * כפילויות שהוסרו בעת האיחוד (היו מוצגות פעמיים באותם 2 טאבים נפרדים):
 * - "השעה הזהובה" מול "פעילות לפי שעות" - שתיהן פירשו את hourlyActivity
 *   לאותם buckets (בוקר/צהריים/ערב/לילה). נשאר "פעילות לפי שעות" (השעון
 *   הרדיאלי עשיר יותר).
 * - "חודש מול חודש" (בר-צ'ארט) מול שורת הסטטיסטיקה שבדופק - שתיהן הציגו
 *   את אותו monthComparison.productsGrowth. נשארה שורת הסטטיסטיקה
 *   (קומפקטית יותר, יחד עם סטריק ותדירות).
 */

interface Props {
  data: InsightsData;
  isDark: boolean;
  onNavigateHome: () => void;
  t: (key: string) => string;
}

export const ActivityTab = memo(({ data, isDark, onNavigateHome, t }: Props) => {
  const {
    stats, topProducts, categoryBreakdown, categoryCycles,
    shoppingScore, streaks, shoppingFrequency, monthComparison,
    weeklyTrends, weekdayActivity, hourlyActivity, upcomingNeeds, anomalies,
    shoppingPersonality, forgotten, smartTips,
  } = data;

  const hasAnyActivity = stats.totalPurchased > 0 || topProducts.length > 0 || shoppingScore > 0;
  if (!hasAnyActivity) {
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="📊"
        floatingItems={['🔥', '🏆', '🎯', '📈']}
        title="עוד אין נתוני פעילות"
        description="הוסף מוצרים לרשימות וסמן כנקנו - כאן יופיעו ציון הקנייה שלך, ההישגים, המוצרים והקטגוריות המובילים, מגמות וגרפים, ותחזית הקנייה הבאה."
        tips={['ציון קנייה', 'הישגים', 'מגמות וקטגוריות']}
        ctaLabel="לרשימות שלי"
        ctaIcon={<HomeIcon sx={{ fontSize: 18 }} />}
        onCtaClick={() => { haptic('medium'); onNavigateHome(); }}
      />
    );
  }

  // כותרת אישית עליונה - ממקדת על הסטריק או התחזית (מה שרלוונטי יותר עכשיו)
  const hasStreak = streaks && streaks.currentWeeks > 0;
  const hasPrediction = shoppingFrequency?.predictedNextDate;
  let heroIcon = '💪';
  let heroText: React.ReactNode = <>ממשיכים לעקוב אחרי ההתקדמות שלך</>;
  if (hasStreak) {
    heroIcon = '🔥';
    heroText = <>אתה <b>{streaks.currentWeeks} שבועות</b> ברצף — המשך כך!</>;
  } else if (hasPrediction) {
    // eslint-disable-next-line react-hooks/purity -- טקסט "בעוד X ימים" תצוגתי בלבד, לא זקוק לדיוק/עקביות בין renders
    const days = Math.max(0, Math.floor((new Date(shoppingFrequency.predictedNextDate!).getTime() - Date.now()) / 86_400_000));
    heroIcon = '🛒';
    heroText = days === 0
      ? <>הקנייה הבאה צפויה <b>היום</b></>
      : days === 1
      ? <>הקנייה הבאה צפויה <b>מחר</b></>
      : <>הקנייה הבאה צפויה <b>בעוד {days} ימים</b></>;
  }

  // הישגים - מחושבים מנתונים שכבר יש
  const achievements = computeAchievements({
    totalPurchased: stats.totalPurchased,
    totalLists: stats.totalLists,
    currentWeeks: streaks?.currentWeeks ?? 0,
    longestWeeks: streaks?.longestWeeks ?? 0,
    completionRate: stats.completionRate,
    categoryCount: categoryBreakdown.length,
  });

  const heroProduct = topProducts[0];
  const heroProductIcon = heroProduct
    ? (CATEGORY_ICONS[heroProduct.category as keyof typeof CATEGORY_ICONS] || '🛒')
    : null;
  const topCategory = categoryBreakdown[0];
  const topCategoryLabel = topCategory
    ? (CATEGORY_TRANSLATION_KEYS[topCategory.category as keyof typeof CATEGORY_TRANSLATION_KEYS]
        ? t(CATEGORY_TRANSLATION_KEYS[topCategory.category as keyof typeof CATEGORY_TRANSLATION_KEYS])
        : topCategory.category)
    : null;

  // Recap slides - "החודש שלך" בסגנון Wrapped. נבנה רק עובדות אמיתיות.
  const recapSlides: { emoji: string; headline: React.ReactNode; sub: string; gradient: string }[] = [];
  if (stats.totalPurchased > 0) recapSlides.push({
    emoji: '🛒',
    headline: <><b>{stats.totalPurchased}</b> פריטים נקנו</>,
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
  if ((streaks?.currentWeeks ?? 0) >= 2) recapSlides.push({
    emoji: '🔥',
    headline: <><b>{streaks!.currentWeeks}</b> שבועות רצוף</>,
    sub: 'בערך כל שבוע יש פעילות — סטריק חי',
    gradient: 'linear-gradient(135deg, #EF4444, #DC2626 60%, #991B1B)',
  });

  return (
    <>
      {/* ===== זהות: מי אתה כקונה, וציון הפעילות שלך ===== */}
      <HeroInsight icon={heroIcon} text={heroText} accent="#14B8A6" isDark={isDark} />
      {shoppingPersonality && stats.totalProducts >= 5 && (
        <PersonalityCard personality={shoppingPersonality} isDark={isDark} />
      )}
      <PulseScoreCard shoppingScore={shoppingScore} completionRate={stats.completionRate} isDark={isDark} />
      <PulseStatsRow streaks={streaks} monthComparison={monthComparison} shoppingFrequency={shoppingFrequency} isDark={isDark} />

      {/* ===== הישגים וסיכום החודש ===== */}
      <AchievementBadges items={achievements} isDark={isDark} />
      <MilestoneProgress
        stats={{ totalPurchased: stats.totalPurchased, totalLists: stats.totalLists }}
        streaks={streaks}
        completionRate={stats.completionRate}
        isDark={isDark}
      />
      {recapSlides.length >= 2 && (
        <MonthRecapCard slides={recapSlides} isDark={isDark} />
      )}

      {/* ===== מוצרים וקטגוריות ===== */}
      {heroProduct && heroProduct.count >= 3 && heroProductIcon && (
        <SpotlightProduct name={heroProduct.name} count={heroProduct.count} icon={heroProductIcon} isDark={isDark} />
      )}
      <HabitsTopProducts topProducts={topProducts} isDark={isDark} t={t} />
      <HabitsCategoryBreakdown categoryBreakdown={categoryBreakdown} isDark={isDark} t={t} />
      <ForgottenProductsCard items={forgotten || []} isDark={isDark} />

      {/* ===== מגמות ודפוסים ===== */}
      <ActivityDotCalendar weeklyTrends={weeklyTrends || []} isDark={isDark} />
      <PulseMomentumCard weeklyTrends={weeklyTrends} />
      <PulseWeeklyTrend weeklyTrends={weeklyTrends} isDark={isDark} />
      <PulseWeekdayHeatmap weekdayActivity={weekdayActivity} isDark={isDark} />
      <PulseHourlyActivity hourlyActivity={hourlyActivity} isDark={isDark} />

      {/* ===== תחזיות והתראות ===== */}
      <PulsePredictionCard shoppingFrequency={shoppingFrequency} isDark={isDark} />
      <PulseUpcomingNeeds upcomingNeeds={upcomingNeeds} isDark={isDark} t={t} />
      <HabitsCategoryCycles categoryCycles={categoryCycles} isDark={isDark} t={t} />
      <PulseAnomalies anomalies={anomalies} isDark={isDark} />
      {smartTips && smartTips.length > 0 && (
        <SmartTipsCarousel tips={smartTips} isDark={isDark} />
      )}
    </>
  );
});

ActivityTab.displayName = 'ActivityTab';
