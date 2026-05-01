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
  lastLoginMethod: 'email' | 'google' | 'app_open' | null;
  lastAppOpenAt: string | null;
}

export interface AdminLoginActivity {
  id: string;
  user: string;
  userName: string;
  userEmail: string;
  loginMethod: 'email' | 'google' | 'app_open';
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
  loginsToday: number;
  uniqueUsersToday: number;
  loginsThisMonth: number;
  uniqueUsersThisMonth: number;
}

export interface AdminUserList {
  id: string;
  name: string;
  isGroup: boolean;
  isOwner: boolean;
  membersCount: number;
  productCount: number;
  purchasedCount: number;
}

export interface AdminUserDetails {
  lists: AdminUserList[];
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

  async getUserDetails(userId: string): Promise<AdminUserDetails> {
    const response = await apiClient.get<{ data: AdminUserDetails }>(`/admin/users/${userId}/details`);
    return response.data.data;
  },

  async getDbHealth(): Promise<DbHealth> {
    const response = await apiClient.get<{ data: DbHealth }>('/admin/db-health');
    return response.data.data;
  },
};

export interface DbHealthCollection {
  name: string;
  documents: number;
  size: number;
  storageSize: number;
  indexSize: number;
}

export interface DbHealth {
  limitMB: number;
  dataSize: number;
  storageSize: number;
  indexSize: number;
  totalSize: number;
  usedPct: number;
  status: 'ok' | 'warning' | 'critical';
  collectionCount: number;
  collections: DbHealthCollection[];
}

export default adminApi;
