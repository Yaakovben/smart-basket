import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

// Reconnection config optimized for mobile
const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 20000,
};

// Socket event types
export interface UserEventData {
  listId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ProductEventData {
  listId: string;
  product: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: string;
  };
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ProductDeletedData {
  listId: string;
  productId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ProductToggledData {
  listId: string;
  productId: string;
  isPurchased: boolean;
  userId: string;
  userName: string;
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
  // For list_update notifications
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

type SocketEventHandler<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketEventHandler<unknown>>> = new Map();
  private joinedLists: Set<string> = new Set();
  private visibilityHandler: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;

  connect() {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    // Clean up existing disconnected/reconnecting socket to prevent connection leaks
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      ...RECONNECTION_CONFIG,
    });

    this.socket.on('connect', () => {
      // Rejoin all lists after reconnect
      this.joinedLists.forEach((listId) => {
        this.socket?.emit('join:list', listId);
      });
      // Notify internal listeners (e.g. usePresence re-requests presence on reconnect)
      this.emit('connect', undefined);
    });

    this.socket.on('disconnect', () => {
      // Socket disconnected, will auto-reconnect
    });

    this.socket.on('connect_error', (error) => {
      // If auth error (token expired/invalid), try reconnecting with fresh token
      if (error.message.includes('auth') || error.message.includes('token') || error.message.includes('expired')) {
        const newToken = getAccessToken();
        if (newToken && this.socket) {
          this.socket.auth = { token: newToken };
        }
      }
    });

    this.socket.on('error', () => {
      // Socket error handled by reconnection logic
    });

    // Setup event forwarding
    this.setupEventForwarding();

    // Setup visibility change handler for mobile
    this.setupVisibilityHandler();

    // Setup network recovery handler
    this.setupOnlineHandler();
  }

  private setupVisibilityHandler() {
    // Remove existing handler if any
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        // App came to foreground - ensure connection
        if (!this.socket?.connected) {
          const token = getAccessToken();
          if (token) {
            if (this.socket) {
              this.socket.auth = { token };
              this.socket.connect();
            } else {
              this.connect();
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private setupOnlineHandler() {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }

    this.onlineHandler = () => {
      // Network came back online - ensure socket is connected
      if (this.socket && !this.socket.connected) {
        const token = getAccessToken();
        if (token) {
          this.socket.auth = { token };
          this.socket.connect();
        }
      }
    };

    window.addEventListener('online', this.onlineHandler);
  }

  private setupEventForwarding() {
    const events = [
      'user:joined',
      'user:left',
      'presence:online',
      'product:added',
      'product:updated',
      'product:deleted',
      'product:toggled',
      'list:updated',
      'list:deleted',
      'notification:new',
      'member:removed',
      'admin:online-users',
      'admin:user-connected',
      'admin:user-disconnected',
    ];

    events.forEach((event) => {
      this.socket?.on(event, (data: unknown) => {
        this.emit(event, data);
      });
    });
  }

  disconnect() {
    // Cleanup visibility handler
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    // Cleanup network recovery handler
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    this.joinedLists.clear();
    // Clear all listeners to prevent memory leaks
    this.listeners.clear();
    this.socket?.disconnect();
    this.socket = null;
  }

  // Join a list room (with optional callback after server confirms join)
  joinList(listId: string, onJoined?: () => void) {
    this.joinedLists.add(listId);
    if (onJoined) {
      this.socket?.emit('join:list', listId, onJoined);
    } else {
      this.socket?.emit('join:list', listId);
    }
  }

  // Leave a list room
  leaveList(listId: string) {
    this.joinedLists.delete(listId);
    this.socket?.emit('leave:list', listId);
  }

  // Request presence for specific lists
  requestPresence(listIds: string[]) {
    if (listIds.length > 0) {
      this.socket?.emit('get:presence', listIds);
    }
  }

  // Request all online users (for admin page)
  requestOnlineUsers() {
    this.socket?.emit('get:online-users');
  }

  // Stop receiving online user updates (when leaving admin page)
  leaveOnlineUsers() {
    this.socket?.emit('leave:online-users');
  }

  // Subscribe to events
  on<T>(event: string, handler: SocketEventHandler<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as SocketEventHandler<unknown>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler as SocketEventHandler<unknown>);
    };
  }

  // Emit to internal listeners
  private emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((handler) => handler(data));
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Update token (called when HTTP client refreshes the access token)
  updateToken(newToken: string) {
    if (this.socket) {
      this.socket.auth = { token: newToken };
      // If connected, send new token to server without reconnecting
      if (this.socket.connected) {
        this.socket.emit('token:refresh', newToken);
      }
    }
  }

  // Emit product added event
  emitProductAdded(listId: string, product: { id: string; name: string; quantity: number; unit: string; category: string }, userName: string) {
    this.socket?.emit('product:add', { listId, product, userName });
  }

  // Emit product updated event
  emitProductUpdated(listId: string, product: { id: string; name: string; quantity: number; unit: string; category: string }, userName: string) {
    this.socket?.emit('product:update', { listId, product, userName });
  }

  // Emit product deleted event
  emitProductDeleted(listId: string, productId: string, productName: string, userName: string) {
    this.socket?.emit('product:delete', { listId, productId, productName, userName });
  }

  // Emit product toggled event
  emitProductToggled(listId: string, productId: string, productName: string, isPurchased: boolean, userName: string) {
    this.socket?.emit('product:toggle', { listId, productId, productName, isPurchased, userName });
  }

  // Emit member joined event
  emitMemberJoined(listId: string, listName: string, userName: string) {
    this.socket?.emit('member:join', { listId, listName, userName });
  }

  // Emit member left event - with optional callback for ack
  emitMemberLeft(listId: string, listName: string, userName: string, onDone?: () => void) {
    if (onDone) {
      this.socket?.emit('member:leave', { listId, listName, userName }, onDone);
    } else {
      this.socket?.emit('member:leave', { listId, listName, userName });
    }
  }

  // Emit member removed event (by admin)
  emitMemberRemoved(listId: string, listName: string, removedUserId: string, removedUserName: string, adminName: string) {
    this.socket?.emit('member:remove', { listId, listName, removedUserId, removedUserName, adminName });
  }

  // Emit list deleted event (by owner) - with optional callback for ack
  emitListDeleted(listId: string, listName: string, memberIds: string[], ownerName: string, onDone?: () => void) {
    if (onDone) {
      this.socket?.emit('list:delete', { listId, listName, memberIds, ownerName }, onDone);
    } else {
      this.socket?.emit('list:delete', { listId, listName, memberIds, ownerName });
    }
  }

  // Emit list settings updated event (by owner)
  emitListUpdated(
    listId: string,
    listName: string,
    userName: string,
    changeType?: 'name' | 'design' | 'both',
    newName?: string
  ) {
    this.socket?.emit('list:update', { listId, listName, userName, changeType, newName });
  }
}

// Singleton instance
export const socketService = new SocketService();

export default socketService;
