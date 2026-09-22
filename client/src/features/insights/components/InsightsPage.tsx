import { memo, useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import { SlowLoadIndicator, ErrorBoundary } from '../../../global/components';
import { haptic } from '../../../global/helpers';
import { useInsightsData } from '../hooks/useInsightsData';
import { usePullToRefresh } from '../../list/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../../list/components/PullToRefreshIndicator';
import { PULL_MAX } from '../../list/helpers/list-helpers';
import { tabEnter, InsightsEmptyState } from './insightsShared';
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
  // ברירת מחדל: 'activity' ולא 'price' - נתוני activity כבר נטענים תמיד
  // (fetchInsights ב-useInsightsData רץ ללא תלות בטאב), בעוד price דורש
  // בקשת השוואת-מחירים נפרדת (מול נתוני שרשרות מסונכרנים/מקורות חיצוניים)
  // שאיטית משמעותית - ברירת מחדל אליה גרמה למסך הראשון שרואים תמיד להיות
  // הכי איטי שיש, בכל כניסה לתובנות.
  const tab: InsightTab = VALID_TABS.includes(tabFromUrl as InsightTab) ? (tabFromUrl as InsightTab) : 'activity';
  const setTab = (v: InsightTab) => {
    if (v !== tab) haptic('light'); // פידבק מישוש בכל שינוי טאב - תחושה מעודנת
    // replace (ולא push) - מעבר טאבים לא יוצר היסטוריה מצטברת
    setSearchParams(v === 'activity' ? {} : { tab: v }, { replace: true });
  };

  const {
    data, priceData, allListsPriceData, loading, error, dataFresh, currentUserName,
    priceLoading, priceLoadingLabel, priceError, retryPriceFetch,
    selectedListId, setSelectedListId, allUserLists,
    userLocation, locationStatus, requestLocation, resetLocationDenied,
    chosenBranches, chooseBranch, onMatchChanged,
    fetchInsights,
  } = useInsightsData(tab);

  // גרירה-למטה לרענון - אחיד עם רשימה/מנהל (usePullToRefresh + PullToRefreshIndicator
  // המשותפים). מרענן תמיד את נתוני הפעילות/הוצאות, ובטאב 'מחירים' גם את השוואת
  // המחירים. lastRefreshedAt מאותחל ל"עכשיו" (לא null) כדי ש"מעודכן ל-HH:MM"
  // יופיע כבר במשיכה הראשונה, לא רק בשנייה.
  const [pageRefreshing, setPageRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(() => new Date());
  const handlePageRefresh = useCallback(() => {
    setPageRefreshing(true);
    fetchInsights();
    if (tab === 'price') retryPriceFetch();
    // fetchInsights/retryPriceFetch לא חושפים Promise (עדכון אופטימיסטי מיידי
    // כבר קיים דרך ה-state שלהם) - חיווי "מרענן" קצר וקבוע, כמו ב-AdminDashboard.
    setTimeout(() => {
      setPageRefreshing(false);
      setLastRefreshedAt(new Date());
    }, 900);
  }, [fetchInsights, retryPriceFetch, tab]);
  const { pullDistance, pullActiveRef, handlePullStart, handlePullMove, handlePullEnd } = usePullToRefresh(handlePageRefresh);

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

  // נופל-בטוח פר-טאב: אם טאב בודד קורס, רק התוכן שלו מוחלף בהודעה ידידותית -
  // הכותרת/בר-הטאבים/ניווט תחתון נשארים תקינים כדי שאפשר לעבור לטאב אחר
  // או לחזור הביתה, במקום לאבד את כל עמוד התובנות (ErrorBoundary כללי יותר
  // קיים ב-router/index.tsx, אבל הוא היה מחליף את כל העמוד).
  const tabCrashFallback = (
    <InsightsEmptyState
      isDark={isDark}
      accent="#F59E0B"
      mainEmoji="😕"
      floatingItems={['⚠️', '🔧', '💤']}
      title={tStr('tabFailedToLoad')}
      description={tStr('tabFailedToLoadDesc')}
      ctaLabel={tStr('toHomePage')}
      onCtaClick={() => navigate('/')}
    />
  );

  return (
    <Box sx={{ height: 'var(--app-height, 100dvh)', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* הכותרת מחוץ למכל הגלילה/גרירה לגמרי - קבועה במקומה, לא נגררת עם
          התוכן. גם כדי ש-top:0 המוחלט של הספינר יתחיל ממש מתחתיה ולא
          יציף אותה (אותו טעם בדיוק כמו ב-ListComponent). */}
      <InsightsHeader isDark={isDark} title={`💡 ${t('insights')}`} onBack={() => navigate(-1)} />

      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* גרירה-למטה לרענון - אחיד עם רשימה/מנהל. הכרטיס יושב מחוץ למכל הגלילה
            כדי שיישאר צמוד לראש התוכן (מתחת לכותרת) במקום לגלול איתו. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        <PullToRefreshIndicator pullDistance={pullDistance} refreshing={pageRefreshing} pullActive={pullActiveRef.current} lastRefreshedAt={lastRefreshedAt} />

        <Box
          onTouchStart={handlePullStart}
          onTouchMove={handlePullMove}
          onTouchEnd={handlePullEnd}
          sx={{
            height: '100%', pb: 'calc(80px + env(safe-area-inset-bottom))',
            overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
            transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, PULL_MAX)}px)` : 'none',
            // eslint-disable-next-line react-hooks/refs
            transition: pullActiveRef.current ? 'none' : 'transform 0.2s ease',
          }}
        >
      {/* חיווי טעינה איטית - בועה קטנה (toast) במסך השוואת מחירים. ה-cache
          המקומי מציג נתונים מיד, החיווי הוא רק לרענון רקע איטי. */}
      <SlowLoadIndicator
        active={tab === 'price' && priceLoading && !priceData}
        variant="toast"
        message={tStr('fetchingPriceComparison')}
        delayMs={5000}
      />

      <InsightsTabsBar isDark={isDark} tab={tab} onTabChange={setTab} />
      <InsightsHeroCard tab={tab} groupStats={data.groupStats} shoppingScore={data.shoppingScore} t={tStr} />

      {/* ===== תוכן לפי טאב - כל טאב עטוף ב-ErrorBoundary נפרד ===== */}
      <Box sx={{ px: 2, animation: `${tabEnter} 0.32s cubic-bezier(0.25, 0.8, 0.25, 1) both` }} key={tab}>
        {tab === 'price' && (
          <ErrorBoundary fallback={tabCrashFallback}>
            <PriceTab
              isDark={isDark}
              priceData={priceData}
              priceLoading={priceLoading}
              priceLoadingLabel={priceLoadingLabel}
              priceError={priceError}
              onRetry={retryPriceFetch}
              locationStatus={locationStatus}
              hasLocation={!!userLocation}
              userLocation={userLocation}
              chosenBranches={chosenBranches}
              onChooseBranch={chooseBranch}
              onMatchChanged={onMatchChanged}
              onRequestLocation={requestLocation}
              onResetLocationDenied={resetLocationDenied}
              selectedListId={selectedListId}
              onSelectListId={setSelectedListId}
              allUserLists={allUserLists}
            />
          </ErrorBoundary>
        )}

        {tab === 'lists' && (
          <ErrorBoundary fallback={tabCrashFallback}>
            <ListsTab
              isDark={isDark}
              stats={data.stats}
              groupStats={data.groupStats}
              priceData={allListsPriceData}
              currentUserName={currentUserName}
              onNavigateHome={() => navigate('/')}
              onNavigateToList={(listId) => navigate(`/list/${listId}`)}
            />
          </ErrorBoundary>
        )}

        {tab === 'activity' && (
          <ErrorBoundary fallback={tabCrashFallback}>
            <ActivityTab data={data} isDark={isDark} onNavigateHome={() => navigate('/')} t={tStr} />
          </ErrorBoundary>
        )}

        {tab === 'spending' && (
          <ErrorBoundary fallback={tabCrashFallback}>
            <SpendingTab data={data} isDark={isDark} t={tStr} dataFresh={dataFresh} />
          </ErrorBoundary>
        )}
      </Box>
      </Box>
      </Box>

      <InsightsBottomNav isDark={isDark} onNavigateHome={() => navigate('/')} t={tStr} />
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
