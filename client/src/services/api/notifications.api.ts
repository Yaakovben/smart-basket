import apiClient from './client';

export type NotificationType =
  | 'join'
  | 'leave'
  | 'removed'
  | 'product_add'
  | 'product_update'
  | 'product_delete'
  | 'product_purchase'
  | 'product_unpurchase'
  | 'member_removed'
  | 'list_deleted'
  | 'list_update';

export interface Notification {
  id: string;
  type: NotificationType;
  listId: string;
  listName: string;
  actorId: string;
  actorName: string;
  productId?: string;
  productName?: string;
  read: boolean;
  createdAt: string;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  listId?: string;
  unreadOnly?: boolean;
}

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

export default notificationsApi;
