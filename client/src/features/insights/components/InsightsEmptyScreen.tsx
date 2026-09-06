import { Box } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { haptic } from '../../../global/helpers';
import { InsightsEmptyState, fadeIn } from './insightsShared';
import { InsightsHeader } from './InsightsHeader';

interface InsightsEmptyScreenProps {
  isDark: boolean;
  t: (key: string) => string;
  onBack: () => void;
  onNavigateHome: () => void;
}

// חיווי משתמש חדש - אין עדיין מוצרים במערכת. מסך פתיחה חם, ידידותי ומסביר:
// halo גדול עם 💡, כותרת ברכה, סקירת 3 התובנות שיופיעו, ו-CTA לחזרה ליצירת רשימה ראשונה.
export const InsightsEmptyScreen = ({ isDark, t, onBack, onNavigateHome }: InsightsEmptyScreenProps) => {
  return (
    <Box sx={{ height: 'var(--app-height, 100dvh)', bgcolor: 'background.default', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', pb: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <InsightsHeader isDark={isDark} title={`💡 ${t('insights')}`} onBack={onBack} mb={2} />

      {/* פשטות: empty-state עם CTA + טיפים מובנים. נקודה. */}
      <Box sx={{ px: 1, animation: `${fadeIn} 0.5s ease` }}>
        <InsightsEmptyState
          isDark={isDark}
          accent="#14B8A6"
          mainEmoji="💡"
          floatingItems={['💰', '📍', '📊', '🛒']}
          title={t('insightsWelcomeTitle')}
          description={t('insightsWelcomeDesc')}
          tips={[t('insightsTipCheapest'), t('insightsTipNearest'), t('insightsTipHabits')]}
          ctaLabel={t('toMyLists')}
          ctaIcon={<HomeIcon sx={{ fontSize: 18 }} />}
          onCtaClick={() => { haptic('medium'); onNavigateHome(); }}
        />
      </Box>
    </Box>
  );
};
