import type { LoginActivity, ActivityFilters, User } from '../../../global/types';

export interface DashboardStats {
  totalUsers: number;
  loginsToday: number;
  loginsThisMonth: number;
}

export interface UseAdminDashboardReturn {
  // Data
  activities: LoginActivity[];
  filteredActivities: LoginActivity[];
  allUsers: User[];
  stats: DashboardStats;

  // State
  isLoading: boolean;
  filters: ActivityFilters;

  // Actions
  setFilters: (filters: ActivityFilters) => void;
  setFilterMode: (mode: ActivityFilters['filterMode']) => void;
  setSelectedMonth: (month: string) => void;
  setSelectedDate: (date: string) => void;
  setSelectedHour: (hour: number) => void;
  resetFilters: () => void;
}
