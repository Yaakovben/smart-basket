import { useState, useMemo, useCallback, useEffect } from "react";
import type { LoginActivity } from "../../../global/types";
import type { UseAdminDashboardReturn, DashboardStats, UserWithLastLogin } from "../types";
import { adminApi, type AdminUser, type AdminLoginActivity, type AdminStats } from "../../../services/api";
import { useSettings } from "../../../global/context/SettingsContext";

// המרת פעילות API לטיפוס קליינט
const convertApiActivity = (apiActivity: AdminLoginActivity): LoginActivity => ({
  id: apiActivity.id,
  userId: apiActivity.user,
  userName: apiActivity.userName,
  userEmail: apiActivity.userEmail,
  loginMethod: apiActivity.loginMethod,
  timestamp: apiActivity.createdAt,
});

export const useAdminDashboard = (): UseAdminDashboardReturn & { loading: boolean; error: string | null } => {
  const { t } = useSettings();
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [serverStats, setServerStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // טעינה מהירה: משתמשים וסטטיסטיקות קודם, פעילות בנפרד
      const [usersData, statsData, activityData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getStats(),
        adminApi.getLoginActivity(1, 100),
      ]);

      setAllUsers(usersData);
      setActivities(
        activityData.activities
          .map(convertApiActivity)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
      setServerStats(statsData);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch admin data:', err);
      setError(t('adminLoadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  // טעינה בעלייה + רענון אוטומטי כשחוזרים לטאב
  useEffect(() => {
    fetchData();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchData]);

  // משתמשים עם סטטיסטיקות התחברות
  const usersWithLoginInfo: UserWithLastLogin[] = useMemo(() => {
    return allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor,
      avatarEmoji: user.avatarEmoji,
      totalLogins: user.totalLogins,
      lastLoginAt: user.lastLoginAt || undefined,
      lastLoginMethod: user.lastLoginMethod || undefined,
      lastAppOpenAt: user.lastAppOpenAt || undefined,
      registrationMethod: (user.googleId ? 'google' : 'email') as 'google' | 'email',
      createdAt: user.createdAt,
    }));
  }, [allUsers]);

  const stats: DashboardStats = useMemo(() => ({
    totalUsers: serverStats?.totalUsers || allUsers.length,
    uniqueUsersToday: serverStats?.uniqueUsersToday || 0,
    loginsToday: serverStats?.loginsToday || 0,
    loginsThisMonth: serverStats?.loginsThisMonth || 0,
    uniqueUsersThisMonth: serverStats?.uniqueUsersThisMonth || 0,
  }), [serverStats, allUsers]);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    activities,
    usersWithLoginInfo,
    stats,
    refreshData,
    loading,
    error,
  };
};
