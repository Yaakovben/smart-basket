import apiClient from './client';
import type { AdminUser, PaginatedActivity, AdminStats, AdminUserDetails, DbHealth } from './types/admin.types';

// DbHealth/DbHealthCollection ממשיכים להיות מיובאים ישירות מהקובץ הזה
// ע"י קומפוננטות DbHealthCard (לא רק דרך ה-barrel index.ts)
export type { DbHealthCollection, DbHealth } from './types/admin.types';

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
