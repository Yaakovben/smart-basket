import apiClient from './client';
import { validateId } from './validate-id';
import type { Notification, PaginatedNotifications, GetNotificationsOptions } from './types/notifications.types';

export const notificationsApi = {
  /** קבלת כל ההתראות של המשתמש המאומת */
  async getNotifications(options: GetNotificationsOptions = {}): Promise<PaginatedNotifications> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.listId) params.append('listId', options.listId);
    if (options.unreadOnly) params.append('unreadOnly', 'true');

    const queryString = params.toString();
    const url = queryString ? `/notifications?${queryString}` : '/notifications';

    const response = await apiClient.get<{
      data: Notification[];
      pagination: PaginatedNotifications['pagination'];
    }>(url);

    return {
      notifications: response.data.data,
      pagination: response.data.pagination,
    };
  },

  /** סימון התראה בודדת כנקראה */
  async markAsRead(notificationId: string): Promise<Notification> {
    validateId(notificationId, 'notificationId');
    const response = await apiClient.put<{ data: Notification }>(
      `/notifications/${notificationId}/read`
    );
    return response.data.data;
  },

  /** סימון כל ההתראות כנקראו */
  async markAllAsRead(listId?: string): Promise<number> {
    const response = await apiClient.put<{ data: { markedCount: number } }>(
      '/notifications/read-all',
      { listId }
    );
    return response.data.data.markedCount;
  },
};
