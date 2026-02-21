import apiClient from './client';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
  googleId?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  // סטטיסטיקות התחברות מהשרת (aggregation)
  totalLogins: number;
  lastLoginAt: string | null;
  lastLoginMethod: 'email' | 'google' | null;
}

export interface AdminLoginActivity {
  id: string;
  user: string;
  userName: string;
  userEmail: string;
  loginMethod: 'email' | 'google';
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PaginatedActivity {
  activities: AdminLoginActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AdminStats {
  totalUsers: number;
  totalLists: number;
  totalGroupLists: number;
  totalProducts: number;
  loginsToday: number;
  uniqueUsersToday: number;
  loginsThisMonth: number;
  uniqueUsersThisMonth: number;
}

export const adminApi = {
  async getUsers(): Promise<AdminUser[]> {
    const response = await apiClient.get<{ data: AdminUser[] }>('/admin/users');
    return response.data.data;
  },

  async getLoginActivity(page = 1, limit = 500): Promise<PaginatedActivity> {
    const response = await apiClient.get<{ data: PaginatedActivity }>('/admin/activity', {
      params: { page, limit }
    });
    return response.data.data;
  },

  async getStats(): Promise<AdminStats> {
    const response = await apiClient.get<{ data: AdminStats }>('/admin/stats');
    return response.data.data;
  },
};

export default adminApi;
