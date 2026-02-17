import type { LoginActivity, ActivityFilters, User } from '../../../global/types';

export interface UserWithLastLogin extends User {
  lastLoginAt?: string;
  lastLoginMethod?: 'email' | 'google';
  totalLogins: number;
}

export interface DashboardStats {
  totalUsers: number;
  loginsToday: number;
  loginsThisMonth: number;
  uniqueUsersToday: number;
  uniqueUsersThisMonth: number;
}

export interface UseAdminDashboardReturn {
  activities: LoginActivity[];
  filteredActivities: LoginActivity[];
  allUsers: User[];
  usersWithLoginInfo: UserWithLastLogin[];
  stats: DashboardStats;
  filters: ActivityFilters;
  setFilters: (filters: ActivityFilters) => void;
  setFilterMode: (mode: ActivityFilters['filterMode']) => void;
  setSelectedMonth: (month: string) => void;
  setSelectedDate: (date: string) => void;
  setSelectedHour: (hour: number) => void;
  resetFilters: () => void;
  refreshData: () => void;
}
