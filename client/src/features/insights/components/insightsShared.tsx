/* eslint-disable react-refresh/only-export-components */
// Barrel ציבורי לרכיבים/כלים המשותפים בין טאבי עמוד התובנות.
// כל רכיב חי בקובץ נפרד תחת ./shared - הקובץ הזה רק מרכז ומייצא מחדש,
// כדי שכל שאר הקוד ימשיך לייבא מ-'./insightsShared' בלי שינוי.
export { float, fadeIn, tabEnter, dayLabels, scoreEmoji } from './shared/animations';
export { AnimatedNumber, StatCard, SectionCard, HeroInsight } from './shared/StatAtoms';
export { InsightsEmptyState } from './shared/InsightsEmptyState';
export { PersonalityCard } from './shared/PersonalityCard';
export { ForgottenProductsCard } from './shared/ForgottenProductsCard';
export { SpotlightProduct } from './shared/SpotlightProduct';
export { SmartTipsCarousel } from './shared/SmartTipsCarousel';
export { GroupLeadershipHero } from './shared/GroupLeadershipHero';
export { CategoryDonut } from './shared/CategoryDonut';
export { ActivityDotCalendar } from './shared/ActivityDotCalendar';
export { RadialHourClock } from './shared/RadialHourClock';
export { useScoreDelta } from '../hooks/useScoreDelta';
export { ScoreTrendBadge } from './shared/ScoreTrendBadge';
