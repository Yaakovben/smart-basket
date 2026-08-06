import { useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DailyFaithManager } from '../../daily-faith';
import { PriceSyncManager } from './PriceSyncManager';
import { DbHealthCard } from './DbHealthCard';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../../../global/hooks';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { useAdminUserFilter } from '../hooks/useAdminUserFilter';
import { mergeOnlineWithSelf } from '../helpers/adminDashboardHelpers';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { AdminDashboardContent } from './AdminDashboardContent';
import { PushBroadcastManager } from './PushBroadcastManager';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const isDark = settings.theme === 'dark';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [faithOpen, setFaithOpen] = useState(false);
  const [priceSyncOpen, setPriceSyncOpen] = useState(false);
  const [dbHealthOpen, setDbHealthOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const {
    activities,
    usersWithLoginInfo,
    stats,
    refreshData,
    loading,
    error
  } = useAdminDashboard();
  const socketOnlineUserIds = useOnlineUsers();
  const isRtl = settings.language === 'he';

  const onlineUserIds = useMemo(
    () => mergeOnlineWithSelf(socketOnlineUserIds, user?.id),
    [socketOnlineUserIds, user?.id]
  );

  const { userSearch, setUserSearch, userFilter, setUserFilter, handleFilterClick, filteredUsers } =
    useAdminUserFilter(usersWithLoginInfo, onlineUserIds);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refreshData]);

  return (
    <Box sx={{ height: '100dvh', bgcolor: isDark ? '#0F1419' : '#F8FAFB', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <AdminDashboardHeader
        isDark={isDark}
        isRtl={isRtl}
        title={t('adminDashboard')}
        faithTitle={t('dailyFaithManagerTitle')}
        isRefreshing={isRefreshing}
        onBack={() => navigate('/settings')}
        onOpenDbHealth={() => setDbHealthOpen(true)}
        onOpenFaith={() => setFaithOpen(true)}
        onOpenPriceSync={() => setPriceSyncOpen(true)}
        onOpenPush={() => setPushOpen(true)}
        onRefresh={handleRefresh}
        userFilter={userFilter}
        onlineCount={onlineUserIds.size}
        stats={stats}
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
      {pushOpen && <PushBroadcastManager onClose={() => setPushOpen(false)} isDark={isDark} users={usersWithLoginInfo} />}
    </Box>
  );
};
