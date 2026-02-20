import { useState, useMemo, useCallback, useEffect } from "react";
import type { ActivityFilters, LoginActivity, User } from "../../../global/types";
import type { UseAdminDashboardReturn, DashboardStats, UserWithLastLogin } from "../types";
import { adminApi, type AdminUser, type AdminLoginActivity } from "../../../services/api";
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
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת נתונים מה-API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, activityData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getLoginActivity(1, 500), // עד 500 פעילויות
      ]);

      setAllUsers(usersData.map(convertApiUser));
      setActivities(activityData.activities.map(convertApiActivity));
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

  // חישוב משתמשים עם מידע התחברות אחרונה
  const usersWithLoginInfo: UserWithLastLogin[] = useMemo(() => {
    return allUsers.map((user: User) => {
      const userActivities = activities
        .filter((a: LoginActivity) => a.userId === user.id)
        .sort((a: LoginActivity, b: LoginActivity) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

      const lastActivity = userActivities[0];

      return {
        ...user,
        lastLoginAt: lastActivity?.timestamp,
        lastLoginMethod: lastActivity?.loginMethod,
        totalLogins: userActivities.length,
      };
    }).sort((a: UserWithLastLogin, b: UserWithLastLogin) => {
      // מיון לפי התחברות אחרונה (חדש ביותר ראשון)
      if (!a.lastLoginAt && !b.lastLoginAt) return 0;
      if (!a.lastLoginAt) return 1;
      if (!b.lastLoginAt) return -1;
      return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    });
  }, [allUsers, activities]);

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

  // חישוב סטטיסטיקות
  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7);

    const todayActivities = activities.filter((a: LoginActivity) => a.timestamp.startsWith(today));
    const monthActivities = activities.filter((a: LoginActivity) => a.timestamp.startsWith(currentMonth));

    // ספירת משתמשים ייחודיים
    const uniqueUsersToday = new Set(todayActivities.map((a: LoginActivity) => a.userId)).size;
    const uniqueUsersThisMonth = new Set(monthActivities.map((a: LoginActivity) => a.userId)).size;

    return {
      totalUsers: allUsers.length,
      loginsToday: todayActivities.length,
      loginsThisMonth: monthActivities.length,
      uniqueUsersToday,
      uniqueUsersThisMonth,
    };
  }, [activities, allUsers]);

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

  return {
    activities,
    filteredActivities,
    allUsers,
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
