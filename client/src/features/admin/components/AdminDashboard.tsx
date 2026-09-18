import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DailyFaithManager } from '../../daily-faith';
import { PriceSyncManager } from './PriceSyncManager';
import { DbHealthCard } from './DbHealthCard';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../../../global/hooks';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { useAdminUserFilter } from '../hooks/useAdminUserFilter';
import { useAiStatus } from '../hooks/useAiStatus';
import { mergeOnlineWithSelf } from '../helpers/adminDashboardHelpers';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { AdminDashboardContent } from './AdminDashboardContent';
import { PushBroadcastManager } from './PushBroadcastManager';
import { AdminAiStatusCard } from './AdminAiStatusCard';
import { usePullToRefresh } from '../../list/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../../list/components/PullToRefreshIndicator';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const isDark = settings.theme === 'dark';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [faithOpen, setFaithOpen] = useState(false);
  const [priceSyncOpen, setPriceSyncOpen] = useState(false);
  const [dbHealthOpen, setDbHealthOpen] = useState(false);
  const [aiStatusOpen, setAiStatusOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const {
    activities,
    usersWithLoginInfo,
    stats,
    refreshData,
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

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refreshData]);

  const { pullDistance, pullActiveRef, handlePullStart, handlePullMove, handlePullEnd } = usePullToRefresh(handleRefresh);

  return (
    <Box
      sx={{ height: 'var(--app-height, 100dvh)', position: 'relative', bgcolor: isDark ? '#0F1419' : '#F8FAFB', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', pb: 'calc(24px + env(safe-area-inset-bottom))' }}
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        refreshing={isRefreshing}
        pullActive={pullActiveRef.current}
        lastRefreshedAt={lastRefreshedAt}
      />
      <AdminDashboardHeader
        isDark={isDark}
        isRtl={isRtl}
        title={t('adminDashboard')}
        faithTitle={t('dailyFaithManagerTitle')}
        onBack={() => navigate('/settings')}
        onOpenDbHealth={() => setDbHealthOpen(true)}
        onOpenFaith={() => setFaithOpen(true)}
        onOpenPriceSync={() => setPriceSyncOpen(true)}
        onOpenAiStatus={() => setAiStatusOpen(true)}
        aiStatus={aiStatus.data}
        onOpenPush={() => setPushOpen(true)}
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
      />

      {faithOpen && <DailyFaithManager onClose={() => setFaithOpen(false)} />}
      {priceSyncOpen && <PriceSyncManager onClose={() => setPriceSyncOpen(false)} />}
      {dbHealthOpen && <DbHealthCard onClose={() => setDbHealthOpen(false)} isDark={isDark} />}
      {aiStatusOpen && (
        <AdminAiStatusCard
          onClose={() => setAiStatusOpen(false)}
          isDark={isDark}
          data={aiStatus.data}
          loading={aiStatus.loading}
          refreshing={aiStatus.refreshing}
          lastFetchAt={aiStatus.lastFetchAt}
          refreshError={aiStatus.refreshError}
          onRefresh={aiStatus.forceRefresh}
        />
      )}
      {pushOpen && <PushBroadcastManager onClose={() => setPushOpen(false)} isDark={isDark} users={usersWithLoginInfo} />}
    </Box>
  );
};
