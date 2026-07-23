import { memo } from 'react';
import type { InsightsData } from '../../../../services/api';
import { HeroInsight, InsightsEmptyState, PersonalityCard, ActivityDotCalendar } from '../insightsShared';
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
 * PulseTab - הטאב "דופק" של עמוד התובנות.
 * מרכיב את הכרטיסים השונים; כל כרטיס מחשב את הנתונים הנגזרים שלו בעצמו
 * מהנתונים הגולמיים שמועברים אליו, כדי לשמור את הקובץ הזה כאורקסטרטור דק.
 */

interface Props {
  data: InsightsData;
  isDark: boolean;
  t: (key: string) => string;
}

export const PulseTab = memo(({ data, isDark, t }: Props) => {
  const {
    shoppingScore, streaks, shoppingFrequency, monthComparison,
    weeklyTrends, weekdayActivity, hourlyActivity, upcomingNeeds, anomalies, stats,
    shoppingPersonality,
  } = data;

  // אין עדיין מספיק נתונים - מסך ריק
  const hasAnyPulseData = shoppingScore > 0 || stats.totalProducts > 0 || (streaks && streaks.currentWeeks > 0);
  if (!hasAnyPulseData) {
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="📊"
        floatingItems={['🔥', '⭐', '🎯', '📈']}
        title="עוד אין נתוני פעילות"
        description="הוסף מוצרים לרשימות וסמן כנקנו - כאן יופיעו ציון הקנייה שלך, רצף שבועות פעילים, תחזית הקנייה הבאה, גרפי מגמות ועוד."
      />
    );
  }

  // כותרת אישית - ממקדת על הסטריק או התחזית
  const hasStreak = streaks && streaks.currentWeeks > 0;
  const hasPrediction = shoppingFrequency?.predictedNextDate;
  let heroIcon = '💪';
  let heroText: React.ReactNode = <>ממשיכים לעקוב אחרי ההתקדמות שלך</>;
  if (hasStreak) {
    heroIcon = '🔥';
    heroText = <>אתה <b>{streaks.currentWeeks} שבועות</b> ברצף — המשך כך!</>;
  } else if (hasPrediction) {
    const days = Math.max(0, Math.floor((new Date(shoppingFrequency.predictedNextDate!).getTime() - Date.now()) / 86_400_000));
    heroIcon = '🛒';
    heroText = days === 0
      ? <>הקנייה הבאה צפויה <b>היום</b></>
      : days === 1
      ? <>הקנייה הבאה צפויה <b>מחר</b></>
      : <>הקנייה הבאה צפויה <b>בעוד {days} ימים</b></>;
  }

  return (
    <>
      <HeroInsight icon={heroIcon} text={heroText} accent="#14B8A6" isDark={isDark} />

      {/* כרטיס אישיות הקונה - הזהות הוויזואלית של המשתמש. מוצג רק אם יש פעילות
          אמיתית כדי לא לתת ל"מתחיל" ברירת מחדל ריקה. */}
      {shoppingPersonality && stats.totalProducts >= 5 && (
        <PersonalityCard personality={shoppingPersonality} isDark={isDark} />
      )}

      {/* לוח נקודות 30 יום - ויזואליזציה GitHub-style של פעילות אחרונה */}
      <ActivityDotCalendar weeklyTrends={weeklyTrends || []} isDark={isDark} />

      <PulseMomentumCard weeklyTrends={weeklyTrends} />
      <PulseUpcomingNeeds upcomingNeeds={upcomingNeeds} isDark={isDark} t={t} />
      <PulseAnomalies anomalies={anomalies} isDark={isDark} />
      <PulseScoreCard shoppingScore={shoppingScore} completionRate={stats.completionRate} isDark={isDark} />
      <PulseStatsRow streaks={streaks} monthComparison={monthComparison} shoppingFrequency={shoppingFrequency} isDark={isDark} />
      <PulsePredictionCard shoppingFrequency={shoppingFrequency} isDark={isDark} />
      <PulseWeeklyTrend weeklyTrends={weeklyTrends} isDark={isDark} />
      <PulseWeekdayHeatmap weekdayActivity={weekdayActivity} isDark={isDark} />
      <PulseHourlyActivity hourlyActivity={hourlyActivity} isDark={isDark} />
    </>
  );
});

PulseTab.displayName = 'PulseTab';
