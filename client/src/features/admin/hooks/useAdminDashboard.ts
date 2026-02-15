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

// Convert API activity to client LoginActivity type
const convertApiActivity = (apiActivity: AdminLoginActivity): LoginActivity => ({
  id: apiActivity.id,
  userId: apiActivity.user,
  userName: apiActivity.userName,
  userEmail: apiActivity.userEmail,
  loginMethod: apiActivity.loginMethod,
  timestamp: apiActivity.createdAt,
});

// Convert API user to client User type
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

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, activityData] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getLoginActivity(1, 500), // Get up to 500 activities
      ]);

      setAllUsers(usersData.map(convertApiUser));
      setActivities(activityData.activities.map(convertApiActivity));
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setError(t('adminLoadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute users with their last login info
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
      // Sort by last login (most recent first), users without login at the end
      if (!a.lastLoginAt && !b.lastLoginAt) return 0;
      if (!a.lastLoginAt) return 1;
      if (!b.lastLoginAt) return -1;
      return new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    });
  }, [allUsers, activities]);

  // Filter activities based on current filters
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
          // Default to today
          result = result.filter((a) => a.timestamp.startsWith(today));
        }
        break;

      case "monthly":
        if (filters.selectedMonth) {
          result = result.filter((a) =>
            a.timestamp.startsWith(filters.selectedMonth!),
          );
        } else {
          // Default to current month
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
          // Filter by hour for today
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
        // No filtering
        break;
    }

    // Sort by timestamp descending (newest first)
    return result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [activities, filters]);

  // Calculate stats
  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentMonth = today.substring(0, 7);

    const todayActivities = activities.filter((a: LoginActivity) => a.timestamp.startsWith(today));
    const monthActivities = activities.filter((a: LoginActivity) => a.timestamp.startsWith(currentMonth));

    // Count unique users
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

  // Actions
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
