import apiClient from './client';
import type { AdminUser, PaginatedActivity, AdminStats, AdminUserDetails, DbHealth, CloudinaryHealth, LocalImagesResult, LocalImagesMigrationResult, AiStatus } from './types/admin.types';

// DbHealth/DbHealthCollection ממשיכים להיות מיובאים ישירות מהקובץ הזה
// ע"י קומפוננטות DbHealthCard (לא רק דרך ה-barrel index.ts)
export type { DbHealthCollection, DbHealth, CloudinaryHealth, LocalImagesResult, LocalImagesMigrationResult, AiStatus, AiProviderStatus, AiProviderRateLimit, AiDailyBudget } from './types/admin.types';

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

  async getCloudinaryHealth(): Promise<CloudinaryHealth> {
    const response = await apiClient.get<{ data: CloudinaryHealth }>('/admin/cloudinary-health');
    return response.data.data;
  },

  /** תמיד dry-run - רק ספירה + גודל, לא מוחק כלום. */
  async getLocalImagesInfo(): Promise<LocalImagesResult> {
    const response = await apiClient.get<{ data: LocalImagesResult }>('/admin/local-images');
    return response.data.data;
  },

  /** מסיר בפועל את שדה image מכל מוצר עם תמונה שמורה מקומית. בלתי הפיך. */
  async clearLocalImages(): Promise<LocalImagesResult> {
    const response = await apiClient.post<{ data: LocalImagesResult }>('/admin/local-images', { confirm: true });
    return response.data.data;
  },

  /** מעלה מנה של תמונות data-URL ל-Cloudinary ומחליף את השדה. שומר את
   *  התמונה ומשחרר מקום ב-DB. remaining>0 -> קרא שוב. */
  async migrateLocalImages(): Promise<LocalImagesMigrationResult> {
    const response = await apiClient.post<{ data: LocalImagesMigrationResult }>('/admin/local-images', { migrate: true });
    return response.data.data;
  },

  /** מחיקת משתמש לצמיתות (רשימות פרטיות, קבוצות בבעלותו, מנויי push, התראות...). בלתי הפיך. */
  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  },

  async getAiStatus(): Promise<AiStatus> {
    const response = await apiClient.get<{ data: AiStatus }>('/admin/ai-status');
    return response.data.data;
  },

  /** מאלץ בדיקה מחדש של מודל Groq עכשיו, בלי לחכות ל-cache השעתי. */
  async refreshAiStatus(): Promise<AiStatus> {
    const response = await apiClient.post<{ data: AiStatus }>('/admin/ai-status/refresh');
    return response.data.data;
  },
};
