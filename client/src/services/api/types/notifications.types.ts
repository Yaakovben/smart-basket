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
  | 'list_update'
  | 'list_clear';

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
