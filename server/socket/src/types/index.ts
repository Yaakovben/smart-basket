import type { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
  userName?: string;
  accessToken?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

// Socket events from client to server
export interface ClientToServerEvents {
  'join:list': (listId: string) => void;
  'leave:list': (listId: string) => void;
  'product:add': (data: { listId: string; product: ProductData & { id?: string }; userName: string }) => void;
  'product:update': (data: { listId: string; product: ProductData & { id: string }; userName: string }) => void;
  'product:toggle': (data: { listId: string; productId: string; productName: string; isPurchased: boolean; userName: string }) => void;
  'product:delete': (data: { listId: string; productId: string; productName: string; userName: string }) => void;
  'notification:read': (data: { listId: string; notificationId?: string }) => void;
  'member:join': (data: { listId: string; listName: string; userName: string }) => void;
  'member:leave': (data: { listId: string; listName: string; userName: string }) => void;
  'member:remove': (data: { listId: string; listName: string; removedUserId: string; removedUserName: string; adminName: string }) => void;
  'list:delete': (data: { listId: string; listName: string; memberIds: string[]; ownerName: string }) => void;
  'list:update': (data: { listId: string; listName: string; userName: string }) => void;
}

// Socket events from server to client
export interface ServerToClientEvents {
  'user:joined': (data: UserEventData) => void;
  'user:left': (data: UserEventData) => void;
  'product:added': (data: ProductEventData) => void;
  'product:updated': (data: ProductEventData) => void;
  'product:deleted': (data: ProductDeletedData) => void;
  'product:toggled': (data: ProductToggledData) => void;
  'list:updated': (data: ListUpdatedData) => void;
  'notification:new': (data: NotificationData) => void;
  'member:removed': (data: MemberRemovedData) => void;
  'list:deleted': (data: ListDeletedData) => void;
  'error': (data: { message: string }) => void;
}

export interface UserEventData {
  listId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ProductData {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export interface ProductEventData {
  listId: string;
  product: ProductData & { id: string };
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ProductDeletedData {
  listId: string;
  productId: string;
  productName?: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ProductToggledData {
  listId: string;
  productId: string;
  productName?: string;
  isPurchased: boolean;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ListUpdatedData {
  listId: string;
  changes: Record<string, unknown>;
  userId: string;
  timestamp: Date;
}

export interface NotificationData {
  id: string;
  type: 'join' | 'leave' | 'removed' | 'product_added' | 'product_purchased' | 'list_deleted' | 'list_update';
  listId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export interface MemberRemovedData {
  listId: string;
  listName: string;
  removedUserId: string;
  removedUserName: string;
  adminId: string;
  adminName: string;
  timestamp: Date;
}

export interface ListDeletedData {
  listId: string;
  listName: string;
  ownerId: string;
  ownerName: string;
  timestamp: Date;
}
