import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types';
import { ApiService } from '../services/api.service';
import { logger } from '../config';
import { checkRateLimit } from '../middleware/rateLimiter.middleware';

// מעקב חיבורי socket לכל משתמש בכל רשימה
// מבנה: listId → userId → Set<socketId>
const listUserSockets = new Map<string, Map<string, Set<string>>>();

// מפה הפוכה: socketId → Set<listId> לניקוי יעיל ב-disconnect
const socketToLists = new Map<string, Set<string>>();

// הוספת חיבור socket למשתמש ברשימה
// מחזיר true אם זה החיבור הראשון של המשתמש לרשימה זו
const addUserSocket = (listId: string, userId: string, socketId: string): boolean => {
  if (!listUserSockets.has(listId)) {
    listUserSockets.set(listId, new Map());
  }
  const userMap = listUserSockets.get(listId)!;
  const isNewUser = !userMap.has(userId);
  if (isNewUser) {
    userMap.set(userId, new Set());
  }
  userMap.get(userId)!.add(socketId);
  if (!socketToLists.has(socketId)) {
    socketToLists.set(socketId, new Set());
  }
  socketToLists.get(socketId)!.add(listId);
  return isNewUser;
};

// הסרת חיבור socket ממשתמש ברשימה
// מחזיר true אם למשתמש אין יותר חיבורים (אופליין מהרשימה)
const removeUserSocket = (listId: string, userId: string, socketId: string): boolean => {
  const userMap = listUserSockets.get(listId);
  if (!userMap) return false;
  const sockets = userMap.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    userMap.delete(userId);
    if (userMap.size === 0) {
      listUserSockets.delete(listId);
    }
    return true;
  }
  return false;
};

const getOnlineUserIds = (listId: string): string[] => {
  const userMap = listUserSockets.get(listId);
  return userMap ? Array.from(userMap.keys()) : [];
};

export const registerListHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  const userId = socket.userId!;

  // הצטרפות לחדר רשימה (עם אימות חברות)
  socket.on('join:list', async (listId: string, callback?: () => void) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (typeof listId !== 'string' || !listId) return;

      const isMember = await ApiService.verifyMembership(listId, socket.accessToken!);
      if (!isMember) {
        return;
      }

      socket.join(`list:${listId}`);
      const isNewUser = addUserSocket(listId, userId, socket.id);

      socket.emit('presence:online', {
        listId,
        userIds: getOnlineUserIds(listId),
      });

      // עדכון אחרים רק אם זה משתמש חדש (לא טאב נוסף)
      if (isNewUser) {
        socket.to(`list:${listId}`).emit('user:joined', {
          listId,
          userId,
          userName: socket.userName || 'Unknown',
          timestamp: new Date(),
        });
      }

      if (typeof callback === 'function') callback();
    } catch (error) {
      logger.error('Error in join:list handler:', error);
    }
  });

  // עזיבת חדר רשימה
  socket.on('leave:list', (listId: string) => {
    if (typeof listId !== 'string' || !listId) return;

    socket.leave(`list:${listId}`);
    const isFullyOffline = removeUserSocket(listId, userId, socket.id);
    socketToLists.get(socket.id)?.delete(listId);
    if (socketToLists.get(socket.id)?.size === 0) {
      socketToLists.delete(socket.id);
    }

    if (isFullyOffline) {
      socket.to(`list:${listId}`).emit('user:left', {
        listId,
        userId,
        userName: socket.userName || 'Unknown',
        timestamp: new Date(),
      });
    }
  });

  // בקשת נוכחות - רק לרשימות שהמשתמש הצטרף אליהן
  socket.on('get:presence', (listIds: string[]) => {
    if (!Array.isArray(listIds) || listIds.length > 50) return;
    for (const listId of listIds) {
      if (typeof listId !== 'string' || !listId) continue;
      if (!socket.rooms.has(`list:${listId}`)) continue;
      socket.emit('presence:online', {
        listId,
        userIds: getOnlineUserIds(listId),
      });
    }
  });

  // ניקוי ב-disconnect דרך מפה הפוכה - O(k)
  socket.on('disconnect', () => {
    const lists = socketToLists.get(socket.id);
    if (lists) {
      for (const listId of lists) {
        const isFullyOffline = removeUserSocket(listId, userId, socket.id);
        if (isFullyOffline) {
          socket.to(`list:${listId}`).emit('user:left', {
            listId,
            userId,
            userName: socket.userName || 'Unknown',
            timestamp: new Date(),
          });
        }
      }
      socketToLists.delete(socket.id);
    }
  });
};

// ניקוי נתוני מעקב כשרשימה נמחקת
export const cleanupListSockets = (listId: string): void => {
  listUserSockets.delete(listId);
};
