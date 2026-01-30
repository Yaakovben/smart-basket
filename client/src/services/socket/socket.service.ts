import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

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

type SocketEventHandler<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketEventHandler<unknown>>> = new Map();

  connect() {
    const token = getAccessToken();
    if (!token) {
      console.warn('No access token available for socket connection');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 30000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Setup event forwarding
    this.setupEventForwarding();
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
      'notification:new',
    ];

    events.forEach((event) => {
      this.socket?.on(event, (data: unknown) => {
        this.emit(event, data);
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  // Join a list room
  joinList(listId: string) {
    this.socket?.emit('join:list', listId);
  }

  // Leave a list room
  leaveList(listId: string) {
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
}

// Singleton instance
export const socketService = new SocketService();

export default socketService;
