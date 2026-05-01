import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { LoginActivity } from "../../../global/types";
import type { UseAdminDashboardReturn, DashboardStats, UserWithLastLogin } from "../types";
import { adminApi, type AdminUser, type AdminLoginActivity, type AdminStats } from "../../../services/api";
import { useSettings } from "../../../global/context/SettingsContext";

// דילוג על refetch אם הבקשה הקודמת הסתיימה לאחרונה - מונע שאילתות מיותרות
// כשהמשתמש עובר בין טאבים תוך שניות.
const REFETCH_SKIP_MS = 30_000;

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
  const lastFetchAtRef = useRef<number>(0);

  const fetchData = useCallback(async (force = false) => {
    // דילוג אם הנתונים טריים (פחות מ-30 שניות) ולא נדרש רענון מפורש
    if (!force && Date.now() - lastFetchAtRef.current < REFETCH_SKIP_MS) return;
    setLoading(true);
    setError(null);
    // 3 בקשות במקביל - כל אחת מעדכנת state ברגע שהיא חוזרת,
    // לא מחכים ל-Promise.all. כך הדף נראה מתמלא בהדרגה במקום
    // להישאר ריק עד שהבקשה האיטית ביותר מסתיימת.
    let pendingCount = 3;
    const onSettled = () => {
      pendingCount -= 1;
      if (pendingCount === 0) {
        lastFetchAtRef.current = Date.now();
        setLoading(false);
      }
    };

    adminApi.getStats()
      .then(stats => setServerStats(stats))
      .catch(err => { if (import.meta.env.DEV) console.error('admin stats:', err); setError(t('adminLoadError')); })
      .finally(onSettled);

    adminApi.getUsers()
      .then(users => setAllUsers(users))
      .catch(err => { if (import.meta.env.DEV) console.error('admin users:', err); setError(t('adminLoadError')); })
      .finally(onSettled);

    adminApi.getLoginActivity(1, 100)
      .then(activityData => setActivities(
        activityData.activities
          .map(convertApiActivity)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      ))
      .catch(err => { if (import.meta.env.DEV) console.error('admin activity:', err); /* not fatal */ })
      .finally(onSettled);
  }, [t]);

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

  // רענון ידני תמיד מתבצע, גם אם הנתונים טריים
  const refreshData = useCallback(() => {
    fetchData(true);
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
