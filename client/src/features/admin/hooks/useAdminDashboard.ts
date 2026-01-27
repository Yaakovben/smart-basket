import { useState, useMemo, useCallback } from 'react';
import type { ActivityFilters, LoginActivity, User } from '../../../global/types';
import type { UseAdminDashboardReturn, DashboardStats } from '../types';
import { ActivityTracker } from '../../../global/services';
import { StorageService } from '../../../global/services/storage';

const DEFAULT_FILTERS: ActivityFilters = {
  filterMode: 'all',
  selectedMonth: undefined,
  selectedDate: undefined,
  selectedHour: undefined
};

export const useAdminDashboard = (): UseAdminDashboardReturn => {
  const [filters, setFilters] = useState<ActivityFilters>(DEFAULT_FILTERS);
  const [isLoading] = useState(false);

  // Get all data
  const activities = useMemo(() => ActivityTracker.getActivities(), []);
  const allUsers = useMemo(() => StorageService.getUsers(), []);

  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    let result = [...activities];

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    switch (filters.filterMode) {
      case 'daily':
        if (filters.selectedDate) {
          result = result.filter(a => a.timestamp.startsWith(filters.selectedDate!));
        } else {
          // Default to today
          result = result.filter(a => a.timestamp.startsWith(today));
        }
        break;

      case 'monthly':
        if (filters.selectedMonth) {
          result = result.filter(a => a.timestamp.startsWith(filters.selectedMonth!));
        } else {
          // Default to current month
          result = result.filter(a => a.timestamp.startsWith(currentMonth));
        }
        break;

      case 'hourly':
        if (filters.selectedHour !== undefined && filters.selectedDate) {
          result = result.filter(a => {
            const date = new Date(a.timestamp);
            const activityDate = a.timestamp.split('T')[0];
            return activityDate === filters.selectedDate && date.getHours() === filters.selectedHour;
          });
        } else if (filters.selectedHour !== undefined) {
          // Filter by hour for today
          result = result.filter(a => {
            const date = new Date(a.timestamp);
            const activityDate = a.timestamp.split('T')[0];
            return activityDate === today && date.getHours() === filters.selectedHour;
          });
        }
        break;

      case 'all':
      default:
        // No filtering
        break;
    }

    // Sort by timestamp descending (newest first)
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activities, filters]);

  // Calculate stats
  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    return {
      totalUsers: allUsers.length,
      loginsToday: activities.filter(a => a.timestamp.startsWith(today)).length,
      loginsThisMonth: activities.filter(a => a.timestamp.startsWith(currentMonth)).length
    };
  }, [activities, allUsers]);

  // Actions
  const setFilterMode = useCallback((mode: ActivityFilters['filterMode']) => {
    setFilters(prev => ({ ...prev, filterMode: mode }));
  }, []);

  const setSelectedMonth = useCallback((month: string) => {
    setFilters(prev => ({ ...prev, selectedMonth: month }));
  }, []);

  const setSelectedDate = useCallback((date: string) => {
    setFilters(prev => ({ ...prev, selectedDate: date }));
  }, []);

  const setSelectedHour = useCallback((hour: number) => {
    setFilters(prev => ({ ...prev, selectedHour: hour }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    activities,
    filteredActivities,
    allUsers,
    stats,
    isLoading,
    filters,
    setFilters,
    setFilterMode,
    setSelectedMonth,
    setSelectedDate,
    setSelectedHour,
    resetFilters
  };
};
