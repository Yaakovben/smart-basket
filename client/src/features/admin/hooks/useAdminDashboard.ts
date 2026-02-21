import { useState, useMemo, useCallback, useEffect } from "react";
import type { ActivityFilters, LoginActivity, User } from "../../../global/types";
import type { UseAdminDashboardReturn, DashboardStats, UserWithLastLogin } from "../types";
import { adminApi, type AdminUser, type AdminLoginActivity, type AdminStats } from "../../../services/api";
import { useSettings } from "../../../global/context/SettingsContext";

const DEFAULT_FILTERS: ActivityFilters = {
  filterMode: "all",
  selectedMonth: undefined,
  selectedDate: undefined,
  selectedHour: undefined,
};

// המרת פעילות API לטיפוס קליינט
const convertApiActivity = (apiActivity: AdminLoginActivity): LoginActivity => ({
  id: apiActivity.id,
  userId: apiActivity.user,
  userName: apiActivity.userName,
  userEmail: apiActivity.userEmail,
  loginMethod: apiActivity.loginMethod,
  timestamp: apiActivity.createdAt,
});

// המרת משתמש API לטיפוס קליינט
const convertApiUser = (apiUser: AdminUser): User => ({
  id: apiUser.id,
  name: apiUser.name,
  email: apiUser.email,
  avatarColor: apiUser.avatarColor,
  avatarEmoji: apiUser.avatarEmoji,
});

export const useAdminDashboard = (): UseAdminDashboardReturn & { loading: boolean; error: string | null } => {
  const { t } = useSettings();
  const [filters, setFilters] = useState<ActivityFilters>(DEFAULT_FILTERS);
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [serverStats, setServerStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת נתונים מה-API (משתמשים עם סטטיסטיקות, פעילויות, וסטטיסטיקות כלליות)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, activityData, statsData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getLoginActivity(1, 500),
        adminApi.getStats(),
      ]);

      setAllUsers(usersData);
      setActivities(activityData.activities.map(convertApiActivity));
      setServerStats(statsData);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to fetch admin data:', err);
      setError(t('adminLoadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  // טעינת נתונים בעלייה
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // משתמשים עם סטטיסטיקות התחברות (נתונים מהשרת, מחושבים ב-MongoDB)
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
    })).sort((a, b) => {
      // מיון לפי התחברות אחרונה (חדש ביותר ראשון)
      if (!a.lastLoginAt && !b.lastLoginAt) return 0;
      if (!a.lastLoginAt) return 1;
      if (!b.lastLoginAt) return -1;
      return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    });
  }, [allUsers]);

  // סינון פעילויות לפי מסננים
  const filteredActivities = useMemo(() => {
    let result = [...activities];

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7);

    switch (filters.filterMode) {
      case "daily":
        if (filters.selectedDate) {
          result = result.filter((a) =>
            a.timestamp.startsWith(filters.selectedDate!),
          );
        } else {
          // ברירת מחדל: היום
          result = result.filter((a) => a.timestamp.startsWith(today));
        }
        break;

      case "monthly":
        if (filters.selectedMonth) {
          result = result.filter((a) =>
            a.timestamp.startsWith(filters.selectedMonth!),
          );
        } else {
          // ברירת מחדל: החודש הנוכחי
          result = result.filter((a) => a.timestamp.startsWith(currentMonth));
        }
        break;

      case "hourly":
        if (filters.selectedHour !== undefined && filters.selectedDate) {
          result = result.filter((a) => {
            const date = new Date(a.timestamp);
            const activityDate = a.timestamp.split("T")[0];
            return (
              activityDate === filters.selectedDate &&
              date.getHours() === filters.selectedHour
            );
          });
        } else if (filters.selectedHour !== undefined) {
          // סינון לפי שעה ביום הנוכחי
          result = result.filter((a) => {
            const date = new Date(a.timestamp);
            const activityDate = a.timestamp.split("T")[0];
            return (
              activityDate === today && date.getHours() === filters.selectedHour
            );
          });
        }
        break;

      case "all":
      default:
        // ללא סינון
        break;
    }

    // מיון לפי זמן (חדש ביותר ראשון)
    return result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [activities, filters]);

  // סטטיסטיקות מהשרת (מחושבות ב-MongoDB, מדויקות לחלוטין)
  const stats: DashboardStats = useMemo(() => ({
    totalUsers: serverStats?.totalUsers || allUsers.length,
    loginsToday: serverStats?.loginsToday || 0,
    loginsThisMonth: serverStats?.loginsThisMonth || 0,
    uniqueUsersToday: serverStats?.uniqueUsersToday || 0,
    uniqueUsersThisMonth: serverStats?.uniqueUsersThisMonth || 0,
  }), [serverStats, allUsers]);

  const setFilterMode = useCallback((mode: ActivityFilters["filterMode"]) => {
    setFilters((prev) => ({ ...prev, filterMode: mode }));
  }, []);

  const setSelectedMonth = useCallback((month: string) => {
    setFilters((prev) => ({ ...prev, selectedMonth: month }));
  }, []);

  const setSelectedDate = useCallback((date: string) => {
    setFilters((prev) => ({ ...prev, selectedDate: date }));
  }, []);

  const setSelectedHour = useCallback((hour: number) => {
    setFilters((prev) => ({ ...prev, selectedHour: hour }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // המרת AdminUser ל-User לתאימות עם הממשק
  const users: User[] = useMemo(() =>
    allUsers.map(convertApiUser),
  [allUsers]);

  return {
    activities,
    filteredActivities,
    allUsers: users,
    usersWithLoginInfo,
    stats,
    filters,
    setFilters,
    setFilterMode,
    setSelectedMonth,
    setSelectedDate,
    setSelectedHour,
    resetFilters,
    refreshData,
    loading,
    error,
  };
};
