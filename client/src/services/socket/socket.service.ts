import { io, Socket } from 'socket.io-client';
import { getAccessToken, refreshAccessToken, isTokenExpired } from '../api/client';

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

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketEventHandler<unknown>>> = new Map();
  private joinedLists: Set<string> = new Set();
  private visibilityHandler: (() => void) | null = null;
  private onlineHandler: (() => void) | null = null;

  connect() {
    const token = getAccessToken();
    if (!token) return;
    if (this.socket?.connected) return;

    // ניקוי חיבור קיים שלא פעיל, מונע דליפות
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

    // העברת אירוע ניתוק למאזינים פנימיים (נוכחות, וכו')
    this.socket.on('disconnect', () => {
      this.emit('disconnect', undefined);
    });

    // שגיאת אימות: רענון טוקן דרך הפונקציה המרכזית המשותפת
    this.socket.on('connect_error', async (error) => {
      const msg = error.message.toLowerCase();
      const isAuthError = msg === 'authentication error' || msg.includes('jwt expired') || msg.includes('token expired') || msg.includes('invalid token') || msg.includes('jwt malformed') || msg.includes('no token');
      if (isAuthError) {
        // שימוש ברענון המרכזי, אותה פונקציה שה HTTP interceptor משתמש בה
        // מונע race condition עם refresh token rotation
        const newToken = await refreshAccessToken();
        if (newToken && this.socket) {
          this.socket.auth = { token: newToken };
          if (!this.socket.connected) {
            this.socket.connect();
          }
        }
      }
    });

    // רישום ריק למניעת אזהרות unhandled
    this.socket.on('error', () => {});

    this.setupEventForwarding();
    this.setupVisibilityHandler();
    this.setupOnlineHandler();
  }

  // חזרה מרקע (מובייל), רענון טוקן פרואקטיבי לפני חיבור מחדש
  private setupVisibilityHandler() {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        if (!this.socket?.connected) {
          // רענון פרואקטיבי: לא מתחברים עם טוקן פג תוקף
          this.reconnectWithFreshToken();
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // חיבור מחדש עם טוקן תקף, מרענן אם צריך
  private async reconnectWithFreshToken() {
    let token = getAccessToken();
    if (!token) return;

    // אם הטוקן פג, מרענן קודם לפני חיבור
    if (isTokenExpired()) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        token = newToken;
      } else {
        return; // לא הצלחנו לרענן, לא מתחברים
      }
    }

    if (this.socket) {
      this.socket.auth = { token };
      this.socket.connect();
    } else {
      this.connect();
    }
  }

  // חזרת רשת, וידוא חיבור
  private setupOnlineHandler() {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }

    this.onlineHandler = () => {
      if (this.socket && !this.socket.connected) {
        this.reconnectWithFreshToken();
      }
    };

    window.addEventListener('online', this.onlineHandler);
  }

  // העברת אירועים למאזינים פנימיים
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

  // הרשמה לאירועים, מחזיר פונקציית ביטול
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

  // עדכון טוקן, נקרא בעת רענון על ידי HTTP client
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

  // לאישור מהשרת עם callback אופציונלי
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

  // לאישור מהשרת עם callback אופציונלי
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
