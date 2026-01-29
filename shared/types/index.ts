// ===== Socket Event Types =====
export type SocketEventType =
  | 'user:joined'
  | 'user:left'
  | 'product:added'
  | 'product:updated'
  | 'product:deleted'
  | 'product:toggled'
  | 'list:updated'
  | 'notification:new';

export interface SocketEvent {
  type: SocketEventType;
  listId: string;
  userId: string;
  userName: string;
  data?: unknown;
  timestamp: Date;
}

// ===== Notification Types =====
export type NotificationType = 'join' | 'leave' | 'product_added' | 'product_purchased';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  listId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// ===== Auth Types =====
export interface TokenPayload {
  userId: string;
  email: string;
}

// ===== User Types =====
export interface IUserBasic {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
}

// ===== Product Types =====
export type ProductUnit = 'יח׳' | 'ק״ג' | 'גרם' | 'ליטר';
export type ProductCategory =
  | 'מוצרי חלב'
  | 'מאפים'
  | 'ירקות'
  | 'פירות'
  | 'בשר'
  | 'משקאות'
  | 'ממתקים'
  | 'ניקיון'
  | 'אחר';

export interface IProduct {
  id: string;
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  isPurchased: boolean;
  addedBy: string;
  createdAt: Date;
}

// ===== Redis Pub/Sub Channel Names =====
export const REDIS_CHANNELS = {
  LIST_EVENTS: 'list:events',
  NOTIFICATIONS: 'notifications',
} as const;
