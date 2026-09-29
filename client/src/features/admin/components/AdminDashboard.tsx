import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../../global/context/SettingsContext';
import { useAuth } from '../../../global/hooks';
import { useAdminDashboard, useOnlineUsers } from '../hooks/admin-hooks';
import { useAdminUserFilter } from '../hooks/useAdminUserFilter';
import { useAiStatus } from '../hooks/useAiStatus';
import { mergeOnlineWithSelf, isEffectivePro } from '../helpers/adminDashboardHelpers';
import { AdminDashboardHeader } from './AdminDashboardHeader';
import { AdminDashboardContent } from './AdminDashboardContent';
import { PullRefreshArea } from '../../../global/components/PullRefreshArea';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const { user } = useAuth();
  const isDark = settings.theme === 'dark';
  // כל אזור (ניהול מאגר, סניפים, מנויים, משובים וכו') נפתח כעמוד נפרד ב-/admin/<אזור>, לא כפופאפ.
  const {
    activities,
    usersWithLoginInfo,
    stats,
    refreshData,
    updateUserPlanLocal,
    loading,
    error,
  } = useAdminDashboard();
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

  // ספירת משתמשי Pro פעילים באמת (Pro שתוקפו עבר לא נספר)
  const proCount = useMemo(
    () => usersWithLoginInfo.filter(isEffectivePro).length,
    [usersWithLoginInfo]
  );

  const { userSearch, setUserSearch, userFilter, setUserFilter, handleFilterClick, filteredUsers } =
    useAdminUserFilter(usersWithLoginInfo, onlineUserIds);

  const handleRefresh = useCallback(() => { void refreshData(); }, [refreshData]);

  // רענון בגרירה: כל העמוד (כולל הכותרת) זז למטה והחיווי מופיע ברווח
  // שנפתח מעליו, מתחת לחריץ המצלמה. כך הוא לא מכסה כפתורים או כרטיסים.
  return (
    <Box sx={{ height: 'var(--app-height, 100dvh)', display: 'flex', flexDirection: 'column', bgcolor: isDark ? '#0F1419' : '#F8FAFB' }}>
    <PullRefreshArea onRefresh={refreshData} safeTop sx={{ pb: 'calc(24px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)))' }}>
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
    </PullRefreshArea>
    </Box>
  );
};
