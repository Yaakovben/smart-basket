import { io, Socket } from 'socket.io-client';
import { getAccessToken, getRefreshToken, setTokens } from '../api/client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

// הגדרות התחברות מחדש מותאמות למובייל
const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 20000,
};

type SocketEventHandler<T> = (data: T) => void;

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketEventHandler<unknown>>> = new Map();
  private joinedLists: Set<string> = new Set();
  private visibilityHandler: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;
  private isRefreshingToken = false;

  connect() {
    const token = getAccessToken();
    if (!token) return;
    if (this.socket?.connected) return;

    // ניקוי socket קיים שלא מחובר - מונע דליפת חיבורים
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      ...RECONNECTION_CONFIG,
    });

    this.socket.on('connect', () => {
      // הצטרפות מחדש לכל הרשימות אחרי reconnect
      this.joinedLists.forEach((listId) => {
        this.socket?.emit('join:list', listId);
      });
      this.emit('connect', undefined);
    });

    this.socket.on('disconnect', () => {});

    this.socket.on('connect_error', async (error) => {
      // שגיאת אימות - רענון טוקן
      if (error.message.includes('auth') || error.message.includes('token') || error.message.includes('expired')) {
        if (this.isRefreshingToken) return;
        this.isRefreshingToken = true;
        try {
          const refreshToken = getRefreshToken();
          if (!refreshToken || !this.socket) return;

          const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            signal: AbortSignal.timeout(10000),
          });

          if (!response.ok) return;

          const data = await response.json();
          const { accessToken, refreshToken: newRefreshToken } = data.data;
          setTokens(accessToken, newRefreshToken);
          this.socket.auth = { token: accessToken };
        } catch {
          // רענון נכשל - הטוקן לא תקף
        } finally {
          this.isRefreshingToken = false;
        }
      }
    });

    this.socket.on('error', () => {});

    this.setupEventForwarding();
    this.setupVisibilityHandler();
    this.setupOnlineHandler();
  }

  // חזרה מרקע (מובייל) - וידוא חיבור
  private setupVisibilityHandler() {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
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

  // חזרת רשת - וידוא חיבור
  private setupOnlineHandler() {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }

    this.onlineHandler = () => {
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

  // העברת אירועים מ-socket.io למאזינים פנימיים
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
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
    this.joinedLists.clear();
    this.listeners.clear();
    this.socket?.disconnect();
    this.socket = null;
  }

  joinList(listId: string, onJoined?: () => void) {
    this.joinedLists.add(listId);
    if (onJoined) {
      this.socket?.emit('join:list', listId, onJoined);
    } else {
      this.socket?.emit('join:list', listId);
    }
  }

  leaveList(listId: string) {
    this.joinedLists.delete(listId);
    this.socket?.emit('leave:list', listId);
  }

  requestPresence(listIds: string[]) {
    if (listIds.length > 0) {
      this.socket?.emit('get:presence', listIds);
    }
  }

  requestOnlineUsers() {
    this.socket?.emit('get:online-users');
  }

  leaveOnlineUsers() {
    this.socket?.emit('leave:online-users');
  }

  // הרשמה לאירועים - מחזיר פונקציית ביטול
  on<T>(event: string, handler: SocketEventHandler<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as SocketEventHandler<unknown>);

    return () => {
      this.listeners.get(event)?.delete(handler as SocketEventHandler<unknown>);
    };
  }

  private emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((handler) => handler(data));
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // עדכון טוקן (נקרא כשה-HTTP client מרענן טוקן)
  updateToken(newToken: string) {
    if (this.socket) {
      this.socket.auth = { token: newToken };
      if (this.socket.connected) {
        this.socket.emit('token:refresh', newToken);
      }
    }
  }

  emitProductAdded(listId: string, product: { id: string; name: string; quantity: number; unit: string; category: string }, userName: string) {
    this.socket?.emit('product:add', { listId, product, userName });
  }

  emitProductUpdated(listId: string, product: { id: string; name: string; quantity: number; unit: string; category: string }, userName: string) {
    this.socket?.emit('product:update', { listId, product, userName });
  }

  emitProductDeleted(listId: string, productId: string, productName: string, userName: string) {
    this.socket?.emit('product:delete', { listId, productId, productName, userName });
  }

  emitProductToggled(listId: string, productId: string, productName: string, isPurchased: boolean, userName: string) {
    this.socket?.emit('product:toggle', { listId, productId, productName, isPurchased, userName });
  }

  emitMemberJoined(listId: string, listName: string, userName: string) {
    this.socket?.emit('member:join', { listId, listName, userName });
  }

  // עם callback אופציונלי לאישור מהשרת
  emitMemberLeft(listId: string, listName: string, userName: string, onDone?: () => void) {
    if (onDone) {
      this.socket?.emit('member:leave', { listId, listName, userName }, onDone);
    } else {
      this.socket?.emit('member:leave', { listId, listName, userName });
    }
  }

  emitMemberRemoved(listId: string, listName: string, removedUserId: string, removedUserName: string, adminName: string) {
    this.socket?.emit('member:remove', { listId, listName, removedUserId, removedUserName, adminName });
  }

  // עם callback אופציונלי לאישור מהשרת
  emitListDeleted(listId: string, listName: string, memberIds: string[], ownerName: string, onDone?: () => void) {
    if (onDone) {
      this.socket?.emit('list:delete', { listId, listName, memberIds, ownerName }, onDone);
    } else {
      this.socket?.emit('list:delete', { listId, listName, memberIds, ownerName });
    }
  }

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

export const socketService = new SocketService();

export default socketService;
