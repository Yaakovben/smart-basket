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

export const adminApi = {
  // Get all users
  async getUsers(): Promise<AdminUser[]> {
    const response = await apiClient.get<{ data: AdminUser[] }>('/admin/users');
    return response.data.data;
  },

  // Get login activity with pagination
  async getLoginActivity(page = 1, limit = 100): Promise<PaginatedActivity> {
    const response = await apiClient.get<{ data: PaginatedActivity }>('/admin/activity', {
      params: { page, limit }
    });
    return response.data.data;
  },
};

export default adminApi;
