import { memo } from 'react';
import HomeIcon from '@mui/icons-material/Home';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS } from '../../../../global/constants';
import { haptic } from '../../../../global/helpers';
import {
  HeroInsight, InsightsEmptyState, PersonalityCard,
  ActivityDotCalendar, ForgottenProductsCard, SpotlightProduct, SmartTipsCarousel,
} from '../insightsShared';
import { ActivitySection } from './ActivitySection';
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
 * מחולק לסקציות גלויות ומתקפלות (ActivitySection) בסדר סיפורי: זהות/ציון →
 * מוצרים/קטגוריות → מגמות → תחזיות/התראות. כל כרטיס מחשב את הנתונים
 * הנגזרים שלו בעצמו מהנתונים הגולמיים, כדי לשמור את הקובץ הזה כאורקסטרטור דק.
 *
 * הוסרו לגמרי (גימיק/גיימיפיקציה בלי מידע אמיתי, לא רק כפילות):
 * - תגי הישגים + התקדמות ליעד (AchievementBadges/MilestoneProgress).
 * - "סיכום החודש" בסגנון Wrapped (MonthRecapCard) - סליידים צבעוניים
 *   שעטפו נתונים אמיתיים בעיצוב "רשתי חברתי", לא הוסיפו מידע.
 *
 * כפילויות שהוסרו בעת האיחוד המקורי (היו מוצגות פעמיים באותם 2 טאבים נפרדים):
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
  // ברירות מחדל לכל שדה מסוג מערך: data יכול להגיע מ-cache מקומי ישן שנשמר
  // לפני שהשדה הזה נוסף ל-API (בדיוק כמו ש-SpendingTab צריך להגן על spending) -
  // בלי ברירת מחדל, קומפוננטת-בת שקוראת ל-x.length/x.map על undefined קורסת
  // מיד עם כניסה לטאב, וה-ErrorBoundary לוכד את זה כ"הטאב לא נטען" - בדיוק
  // התופעה של קריסה חד-פעמית "כשנכנסים לשם".
  const {
    stats,
    topProducts = [], categoryBreakdown = [], categoryCycles = [],
    shoppingScore = 0, streaks, shoppingFrequency, monthComparison,
    weeklyTrends = [], weekdayActivity = [], hourlyActivity = [], upcomingNeeds = [], anomalies = [],
    shoppingPersonality, forgotten = [], smartTips = [],
  } = data;

  const hasAnyActivity = stats.totalPurchased > 0 || topProducts.length > 0 || shoppingScore > 0;
  if (!hasAnyActivity) {
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="📊"
        floatingItems={['🔥', '🏆', '🎯', '📈']}
        title={t('noActivityDataYet')}
        description={t('noActivityDataDesc')}
        tips={[t('tipShoppingScore'), t('tipTrendsCategories'), t('tipPredictions')]}
        ctaLabel={t('toMyLists')}
        ctaIcon={<HomeIcon sx={{ fontSize: 18 }} />}
        onCtaClick={() => { haptic('medium'); onNavigateHome(); }}
      />
    );
  }

  // כותרת אישית עליונה - ממקדת על הסטריק או התחזית (מה שרלוונטי יותר עכשיו)
  const hasStreak = streaks && streaks.currentWeeks > 0;
  const hasPrediction = shoppingFrequency?.predictedNextDate;
  let heroIcon = '💪';
  let heroText: React.ReactNode = <>{t('heroKeepTrackingProgress')}</>;
  if (hasStreak) {
    heroIcon = '🔥';
    heroText = <>{t('heroStreakPrefix')} <b>{t('heroStreakWeeksBold').replace('{weeks}', String(streaks.currentWeeks))}</b> {t('heroStreakSuffix')}</>;
  } else if (hasPrediction) {
    // eslint-disable-next-line react-hooks/purity -- טקסט "בעוד X ימים" תצוגתי בלבד, לא זקוק לדיוק/עקביות בין renders
    const days = Math.max(0, Math.floor((new Date(shoppingFrequency.predictedNextDate!).getTime() - Date.now()) / 86_400_000));
    heroIcon = '🛒';
    heroText = days === 0
      ? <>{t('nextShopPrefix')} <b>{t('today')}</b></>
      : days === 1
      ? <>{t('nextShopPrefix')} <b>{t('tomorrowWord')}</b></>
      : <>{t('nextShopPrefix')} <b>{t('nextShopInDaysBold').replace('{days}', String(days))}</b></>;
  }

  const heroProduct = topProducts[0];
  const heroProductIcon = heroProduct
    ? (CATEGORY_ICONS[heroProduct.category as keyof typeof CATEGORY_ICONS] || '🛒')
    : null;

  return (
    <>
      {/* ===== זהות: מי אתה כקונה, וציון הפעילות שלך ===== */}
      <HeroInsight icon={heroIcon} text={heroText} accent="#14B8A6" isDark={isDark} />

      <ActivitySection title={t('sectionIdentity')} icon="🎯" isDark={isDark}>
        {shoppingPersonality && stats.totalProducts >= 5 && (
          <PersonalityCard personality={shoppingPersonality} isDark={isDark} />
        )}
        <PulseScoreCard shoppingScore={shoppingScore} completionRate={stats.completionRate} isDark={isDark} />
        <PulseStatsRow streaks={streaks} monthComparison={monthComparison} shoppingFrequency={shoppingFrequency} isDark={isDark} />
      </ActivitySection>

      <ActivitySection title={t('sectionProductsCategories')} icon="📦" isDark={isDark}>
        {heroProduct && heroProduct.count >= 3 && heroProductIcon && (
          <SpotlightProduct name={heroProduct.name} count={heroProduct.count} icon={heroProductIcon} isDark={isDark} t={t} />
        )}
        <HabitsTopProducts topProducts={topProducts} isDark={isDark} t={t} />
        <HabitsCategoryBreakdown categoryBreakdown={categoryBreakdown} isDark={isDark} t={t} />
        <ForgottenProductsCard items={forgotten || []} isDark={isDark} t={t} />
      </ActivitySection>

      <ActivitySection title={t('sectionTrendsPatterns')} icon="📈" isDark={isDark} defaultExpanded={false}>
        <ActivityDotCalendar weeklyTrends={weeklyTrends || []} isDark={isDark} t={t} />
        <PulseMomentumCard weeklyTrends={weeklyTrends} t={t} />
        <PulseWeeklyTrend weeklyTrends={weeklyTrends} isDark={isDark} t={t} />
        <PulseWeekdayHeatmap weekdayActivity={weekdayActivity} isDark={isDark} t={t} />
        <PulseHourlyActivity hourlyActivity={hourlyActivity} isDark={isDark} t={t} />
      </ActivitySection>

      <ActivitySection title={t('sectionPredictionsAlerts')} icon="🔮" isDark={isDark} defaultExpanded={false}>
        <PulsePredictionCard shoppingFrequency={shoppingFrequency} isDark={isDark} />
        <PulseUpcomingNeeds upcomingNeeds={upcomingNeeds} isDark={isDark} t={t} />
        <HabitsCategoryCycles categoryCycles={categoryCycles} isDark={isDark} t={t} />
        <PulseAnomalies anomalies={anomalies} isDark={isDark} t={t} />
        {smartTips && smartTips.length > 0 && (
          <SmartTipsCarousel tips={smartTips} isDark={isDark} t={t} />
        )}
      </ActivitySection>
    </>
  );
});

ActivityTab.displayName = 'ActivityTab';
