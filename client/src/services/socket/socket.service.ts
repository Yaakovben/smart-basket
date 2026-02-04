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
  type: 'join' | 'leave' | 'product_added' | 'product_purchased';
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

type SocketEventHandler<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketEventHandler<unknown>>> = new Map();
  private joinedLists: Set<string> = new Set();
  private visibilityHandler: (() => void) | null = null;

  connect() {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    if (this.socket?.connected) {
      return;
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
          // Reconnect with the new token after a short delay
          setTimeout(() => this.socket?.connect(), 100);
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

  private setupEventForwarding() {
    const events = [
      'user:joined',
      'user:left',
      'product:added',
      'product:updated',
      'product:deleted',
      'product:toggled',
      'list:updated',
      'list:deleted',
      'notification:new',
      'member:removed',
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
    this.joinedLists.clear();
    this.socket?.disconnect();
    this.socket = null;
  }

  // Join a list room
  joinList(listId: string) {
    this.joinedLists.add(listId);
    this.socket?.emit('join:list', listId);
  }

  // Leave a list room
  leaveList(listId: string) {
    this.joinedLists.delete(listId);
    this.socket?.emit('leave:list', listId);
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
      // If connected, reconnect with the new token
      if (this.socket.connected) {
        this.socket.disconnect();
        this.socket.connect();
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

  // Emit member left event
  emitMemberLeft(listId: string, listName: string, userName: string) {
    this.socket?.emit('member:leave', { listId, listName, userName });
  }

  // Emit member removed event (by admin)
  emitMemberRemoved(listId: string, listName: string, removedUserId: string, removedUserName: string, adminName: string) {
    this.socket?.emit('member:remove', { listId, listName, removedUserId, removedUserName, adminName });
  }

  // Emit list deleted event (by owner)
  emitListDeleted(listId: string, listName: string, memberIds: string[], ownerName: string) {
    this.socket?.emit('list:delete', { listId, listName, memberIds, ownerName });
  }
}

// Singleton instance
export const socketService = new SocketService();

export default socketService;
