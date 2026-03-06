import type { LoginActivity, User } from '../../../global/types';

export interface UserWithLastLogin extends User {
  lastLoginAt?: string;
  lastLoginMethod?: 'email' | 'google' | 'app_open';
  lastAppOpenAt?: string;
  registrationMethod: 'google' | 'email';
  createdAt: string;
  totalLogins: number;
}

export interface DashboardStats {
  totalUsers: number;
  uniqueUsersToday: number;
}

export interface UseAdminDashboardReturn {
  activities: LoginActivity[];
  usersWithLoginInfo: UserWithLastLogin[];
  stats: DashboardStats;
  refreshData: () => void;
}
