import { memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import { SlowLoadIndicator } from '../../../global/components';
import { haptic } from '../../../global/helpers';
import { useInsightsData } from '../hooks/useInsightsData';
import { tabEnter } from './insightsShared';
import type { InsightTab } from '../types/insights-types';
import { InsightsHeader } from './InsightsHeader';
import { InsightsLoadingState } from './InsightsLoadingState';
import { InsightsErrorState } from './InsightsErrorState';
import { InsightsEmptyScreen } from './InsightsEmptyScreen';
import { InsightsTabsBar } from './InsightsTabsBar';
import { InsightsHeroCard } from './InsightsHeroCard';
import { InsightsBottomNav } from './InsightsBottomNav';
import { PriceTab } from './tabs/PriceTab';
import { ListsTab } from './tabs/ListsTab';
import { ActivityTab } from './tabs/ActivityTab';
import { SpendingTab } from './tabs/SpendingTab';

const VALID_TABS: InsightTab[] = ['price', 'lists', 'activity', 'spending'];

export const InsightsPage = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';

  // הטאב נשמר ב-URL (?tab=lists) כדי ש"חזור" מדף הרשימה יחזיר אותנו לטאב הנכון.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const tab: InsightTab = VALID_TABS.includes(tabFromUrl as InsightTab) ? (tabFromUrl as InsightTab) : 'price';
  const setTab = (v: InsightTab) => {
    if (v !== tab) haptic('light'); // פידבק מישוש בכל שינוי טאב - תחושה מעודנת
    // replace (ולא push) - מעבר טאבים לא יוצר היסטוריה מצטברת
    setSearchParams(v === 'price' ? {} : { tab: v }, { replace: true });
  };

  const {
    data, priceData, loading, error, currentUserName,
    priceLoading, priceLoadingLabel, priceError, retryPriceFetch,
    selectedListId, setSelectedListId, allUserLists,
    locationStatus, requestLocation, resetLocationDenied,
  } = useInsightsData(tab);

  const tStr = t as (k: string) => string;

  if (loading) return <InsightsLoadingState isDark={isDark} />;

  // מסך שגיאה - חיבור נכשל. נפרד ממצב "משתמש חדש" שמטופל למטה.
  if (error) return <InsightsErrorState onBack={() => navigate(-1)} t={tStr} />;

  // ===== חיווי משתמש חדש - אין עדיין מוצרים במערכת =====
  if (!data || data.stats.totalProducts === 0) {
    return (
      <InsightsEmptyScreen
        isDark={isDark}
        t={tStr}
        onBack={() => navigate(-1)}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  return (
    <Box sx={{ height: '100dvh', bgcolor: 'background.default', pb: 'calc(80px + env(safe-area-inset-bottom))', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      {/* חיווי טעינה איטית - בועה קטנה (toast) במסך השוואת מחירים. ה-cache
          המקומי מציג נתונים מיד, החיווי הוא רק לרענון רקע איטי. */}
      <SlowLoadIndicator
        active={tab === 'price' && priceLoading && !priceData}
        variant="toast"
        message="מאחזר השוואת מחירים…"
        delayMs={5000}
      />

      <InsightsHeader isDark={isDark} title={`💡 ${t('insights')}`} onBack={() => navigate(-1)} />
      <InsightsTabsBar isDark={isDark} tab={tab} onTabChange={setTab} />
      <InsightsHeroCard tab={tab} groupStats={data.groupStats} shoppingScore={data.shoppingScore} />

      {/* ===== תוכן לפי טאב ===== */}
      <Box sx={{ px: 2, animation: `${tabEnter} 0.32s cubic-bezier(0.25, 0.8, 0.25, 1) both` }} key={tab}>
        {tab === 'price' && (
          <PriceTab
            isDark={isDark}
            priceData={priceData}
            priceLoading={priceLoading}
            priceLoadingLabel={priceLoadingLabel}
            priceError={priceError}
            onRetry={retryPriceFetch}
            locationStatus={locationStatus}
            onRequestLocation={requestLocation}
            onResetLocationDenied={resetLocationDenied}
            selectedListId={selectedListId}
            onSelectListId={setSelectedListId}
            allUserLists={allUserLists}
          />
        )}

        {tab === 'lists' && (
          <ListsTab
            isDark={isDark}
            stats={data.stats}
            groupStats={data.groupStats}
            priceData={priceData}
            currentUserName={currentUserName}
            onNavigateHome={() => navigate('/')}
            onNavigateToList={(listId) => navigate(`/list/${listId}`)}
          />
        )}

        {tab === 'activity' && (
          <ActivityTab data={data} isDark={isDark} onNavigateHome={() => navigate('/')} t={tStr} />
        )}

        {tab === 'spending' && <SpendingTab data={data} isDark={isDark} t={tStr} />}
      </Box>

      <InsightsBottomNav isDark={isDark} onNavigateHome={() => navigate('/')} t={tStr} />
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
