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

// אירועי Socket מהקליינט לשרת
export interface ClientToServerEvents {
  'join:list': (listId: string, callback?: () => void) => void;
  'leave:list': (listId: string) => void;
  'get:presence': (listIds: string[]) => void;
  'product:add': (data: { listId: string; product: ProductData & { id?: string }; userName: string }) => void;
  'product:update': (data: { listId: string; product: ProductData & { id: string }; userName: string }) => void;
  'product:toggle': (data: { listId: string; productId: string; productName: string; isPurchased: boolean; userName: string }) => void;
  'product:delete': (data: { listId: string; productId: string; productName: string; userName: string }) => void;
  'member:join': (data: { listId: string; listName: string; userName: string }) => void;
  'member:leave': (data: { listId: string; listName: string; userName: string }, callback?: () => void) => void;
  'member:remove': (data: { listId: string; listName: string; removedUserId: string; removedUserName: string; adminName: string }) => void;
  'list:delete': (data: { listId: string; listName: string; memberIds: string[]; ownerName: string }, callback?: () => void) => void;
  'list:update': (data: { listId: string; listName: string; userName: string; changeType?: 'name' | 'design' | 'both'; newName?: string }) => void;
  'token:refresh': (token: string) => void;
  'get:online-users': () => void;
  'leave:online-users': () => void;
}

// אירועי Socket מהשרת לקליינט
export interface ServerToClientEvents {
  'user:joined': (data: UserEventData) => void;
  'user:left': (data: UserEventData) => void;
  'presence:online': (data: PresenceData) => void;
  'product:added': (data: ProductEventData) => void;
  'product:updated': (data: ProductEventData) => void;
  'product:deleted': (data: ProductDeletedData) => void;
  'product:toggled': (data: ProductToggledData) => void;
  'list:updated': (data: ListUpdatedData) => void;
  'notification:new': (data: NotificationData) => void;
  'member:removed': (data: MemberRemovedData) => void;
  'list:deleted': (data: ListDeletedData) => void;
  'admin:online-users': (data: { userIds: string[] }) => void;
  'admin:user-connected': (data: { userId: string }) => void;
  'admin:user-disconnected': (data: { userId: string }) => void;
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
  type: 'join' | 'leave' | 'removed' | 'product_add' | 'product_update' | 'product_delete' | 'list_update';
  listId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  // עבור התראות list_update
  changeType?: 'name' | 'design' | 'both';
  newName?: string;
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

export interface PresenceData {
  listId: string;
  userIds: string[];
}
