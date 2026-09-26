import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../../../global/hooks';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { useAdminUserFilter } from '../hooks/useAdminUserFilter';
import { useAiStatus } from '../hooks/useAiStatus';
import { mergeOnlineWithSelf } from '../helpers/adminDashboardHelpers';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { AdminDashboardContent } from './AdminDashboardContent';
import { usePullToRefresh } from '../../list/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../../list/components/PullToRefreshIndicator';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const isDark = settings.theme === 'dark';
  const [isRefreshing, setIsRefreshing] = useState(false);
  // כל אזור (ניהול מאגר, סניפים, מנויים, משובים וכו') נפתח כעמוד נפרד ב-/admin/<אזור>, לא כפופאפ.
  const {
    activities,
    usersWithLoginInfo,
    stats,
    refreshData,
    updateUserPlanLocal,
    loading,
    error,
    lastFetchAt,
  } = useAdminDashboard();
  const lastRefreshedAt = lastFetchAt ? new Date(lastFetchAt) : null;
  const socketOnlineUserIds = useOnlineUsers();
  // מוחזק כאן פעם אחת (לא בתוך הפאנל) כדי שנקודת הסטטוס על האייקון בכותרת
  // תשקף את אותם הנתונים בלי לירות בקשת רשת כפולה כשפותחים את הפאנל.
  // autoLoad=false: לא נטען מיד ב-mount - מחכה שהמשתמשים (הנתון הקריטי,
  // ראו useAdminDashboard) יחזרו קודם, כדי לא להתחרות איתם על אותו
  // pool חיבורים/שרת ולעכב את מה שהמנהל בפועל מחכה לו.
  const aiStatus = useAiStatus(false);
  const aiStatusStartedRef = useRef(false);
  useEffect(() => {
    if (!loading && !aiStatusStartedRef.current) {
      aiStatusStartedRef.current = true;
      aiStatus.load();
    }
  }, [loading, aiStatus.load]);
  const isRtl = settings.language === 'he';

  const onlineUserIds = useMemo(
    () => mergeOnlineWithSelf(socketOnlineUserIds, user?.id),
    [socketOnlineUserIds, user?.id]
  );

  // ספירת משתמשי Pro מתוך רשימת כל המשתמשים
  const proCount = useMemo(
    () => usersWithLoginInfo.filter(u => u.plan === 'pro').length,
    [usersWithLoginInfo]
  );

  const { userSearch, setUserSearch, userFilter, setUserFilter, handleFilterClick, filteredUsers } =
    useAdminUserFilter(usersWithLoginInfo, onlineUserIds);

  // token (לא boolean) - ראו PullToRefreshIndicator: מזהה ייחודי לכל כישלון
  // כדי שכישלונות חוזרים ברצף יפעילו מחדש את חיווי "הרענון נכשל" האדום.
  const [refreshFailedToken, setRefreshFailedToken] = useState<number | null>(null);
  // "עודכן"/"נכשל" מוצגים רק לפי התוצאה האמיתית של refreshData - לא לפי
  // טיימר קבוע בלי קשר לתוצאה (אותו באג שתוקן קודם בעמוד התובנות).
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refreshData().then(ok => {
      setIsRefreshing(false);
      if (!ok) setRefreshFailedToken(Date.now());
    });
  }, [refreshData]);

  const { pullDistance, pullActiveRef, handlePullStart, handlePullMove, handlePullEnd } = usePullToRefresh(handleRefresh);

  return (
    <Box
      sx={{ height: 'var(--app-height, 100dvh)', position: 'relative', bgcolor: isDark ? '#0F1419' : '#F8FAFB', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', pb: 'calc(24px + env(safe-area-inset-bottom))' }}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
    >
      <AdminDashboardHeader
        isDark={isDark}
        isRtl={isRtl}
        title={t('adminDashboard')}
        faithTitle={t('dailyFaithManagerTitle')}
        onBack={() => navigate('/settings')}
        onOpenDbHealth={() => navigate('/admin/db')}
        onOpenFaith={() => navigate('/admin/faith')}
        onOpenPriceSync={() => navigate('/admin/price-sync')}
        onOpenAiStatus={() => navigate('/admin/ai')}
        aiStatus={aiStatus.data}
        onOpenPush={() => navigate('/admin/push')}
        onOpenSubscriptions={() => navigate('/admin/subscriptions')}
        onOpenFeedback={() => navigate('/admin/feedback')}
        onRefresh={handleRefresh}
        userFilter={userFilter}
        onlineCount={onlineUserIds.size}
        stats={stats}
        proCount={proCount}
        loading={loading}
        onFilterClick={handleFilterClick}
        onSelectAll={() => setUserFilter('all')}
        t={t}
      />

      {/* עוטפים את האינדיקטור+התוכן יחד ב-position:relative נפרד מהמכל
          החיצוני (שכולל גם את הכותרת) - כדי שה-top:0 המוחלט של
          PullToRefreshIndicator יתחיל ממש מתחת לכותרת, לא מאחורי הכותרת
          עצמה (מה שקרה כשהוא ישב ישירות במכל החיצוני - התנגש עם החריץ/
          מצלמת הטלפון, אותו באג בדיוק שכבר תוקן ב-ListComponent). */}
      <Box sx={{ position: 'relative' }}>
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          refreshing={isRefreshing}
          pullActive={pullActiveRef.current}
          lastRefreshedAt={lastRefreshedAt}
          refreshFailedToken={refreshFailedToken}
        />
        <AdminDashboardContent
          error={error}
          loading={loading}
          isDark={isDark}
          onRetry={handleRefresh}
          t={t}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          filteredUsers={filteredUsers}
          activities={activities}
          language={settings.language}
          onlineUserIds={onlineUserIds}
          onUserDeleted={refreshData}
          onUserPlanChanged={updateUserPlanLocal}
        />
      </Box>

    </Box>
  );
};
