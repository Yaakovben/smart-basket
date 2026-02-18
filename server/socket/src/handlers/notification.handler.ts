import crypto from 'crypto';
import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  NotificationData,
  MemberRemovedData,
  ListDeletedData,
} from '../types';
import { ApiService } from '../services/api.service';
import { logger } from '../config';
import { checkRateLimit } from '../middleware/rateLimiter.middleware';
import { isValidString } from '../utils/validation';
import { cleanupListSockets } from './list.handler';

const generateNotificationId = (userId: string): string =>
  `notif_${crypto.randomUUID()}_${userId}`;

export const registerNotificationHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  const userId = socket.userId!;
  const userName = socket.userName || 'Unknown';

  // חבר הצטרף לרשימה
  socket.on('member:join', (data: { listId: string; listName: string; userName: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId) || !isValidString(data?.listName)) {
        logger.warn('Invalid member:join data from user:', userId);
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      const notification: NotificationData = {
        id: generateNotificationId(userId),
        type: 'join',
        listId: data.listId,
        userId,
        userName, // מהטוקן, לא מהקליינט
        message: `${userName} joined ${data.listName}`,
        timestamp: new Date(),
      };

      socket.to(`list:${data.listId}`).emit('notification:new', notification);
      logger.debug(`User ${userName} joined group ${data.listName}`);
    } catch (error) {
      logger.error('Error in member:join handler:', error);
    }
  });

  // חבר עזב רשימה
  socket.on('member:leave', (data: { listId: string; listName: string; userName: string }, callback?: () => void) => {
    try {
      if (!checkRateLimit(socket.id)) {
        if (typeof callback === 'function') callback();
        return;
      }
      if (!isValidString(data?.listId) || !isValidString(data?.listName)) {
        logger.warn('Invalid member:leave data from user:', userId);
        if (typeof callback === 'function') callback();
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) {
        if (typeof callback === 'function') callback();
        return;
      }

      const notification: NotificationData = {
        id: generateNotificationId(userId),
        type: 'leave',
        listId: data.listId,
        userId,
        userName, // מהטוקן, לא מהקליינט
        message: `${userName} left ${data.listName}`,
        timestamp: new Date(),
      };

      // שידור לכל המשתמשים ברשימה (כולל השולח - הוא בכל מקרה עוזב)
      io.to(`list:${data.listId}`).emit('notification:new', notification);
      logger.debug(`User ${userName} left group ${data.listName}`);

      // אישור לקליינט כדי שיוכל להמשיך בבטחה לקריאת API
      if (typeof callback === 'function') callback();
    } catch (error) {
      logger.error('Error in member:leave handler:', error);
      if (typeof callback === 'function') callback();
    }
  });

  // הסרת חבר מרשימה (ע"י מנהל/בעלים)
  socket.on('member:remove', async (data: { listId: string; listName: string; removedUserId: string; removedUserName: string; adminName: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId) || !isValidString(data?.removedUserId) || !isValidString(data?.listName) || !isValidString(data?.removedUserName)) {
        logger.warn('Invalid member:remove data from user:', userId);
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      // אימות שהשולח בעלים או מנהל
      const role = await ApiService.checkRole(data.listId, userId, socket.accessToken!);
      if (role !== 'owner' && role !== 'admin') {
        logger.warn(`User ${userId} attempted member:remove without permission (role: ${role})`);
        return;
      }

      const removedData: MemberRemovedData = {
        listId: data.listId,
        listName: data.listName,
        removedUserId: data.removedUserId,
        removedUserName: data.removedUserName,
        adminId: userId,
        adminName: userName, // מהטוקן, לא מהקליינט
        timestamp: new Date(),
      };

      // שליחת התראה ישירה למשתמש שהוסר
      io.to(`user:${data.removedUserId}`).emit('member:removed', removedData);

      // גם עדכון שאר החברים ברשימה
      const removedNotification: NotificationData = {
        id: generateNotificationId(data.removedUserId),
        type: 'removed',
        listId: data.listId,
        userId: data.removedUserId,
        userName: data.removedUserName,
        message: `${data.removedUserName} was removed from ${data.listName}`,
        timestamp: new Date(),
      };
      socket.to(`list:${data.listId}`).emit('notification:new', removedNotification);

      logger.debug(`User ${data.removedUserName} was removed from group ${data.listName} by ${userName}`);
    } catch (error) {
      logger.error('Error in member:remove handler:', error);
    }
  });

  // עדכון הגדרות רשימה ע"י בעלים
  socket.on('list:update', async (data: { listId: string; listName: string; userName: string; changeType?: 'name' | 'design' | 'both'; newName?: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId)) {
        logger.warn('Invalid list:update data from user:', userId);
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      if (data.changeType && !['name', 'design', 'both'].includes(data.changeType)) {
        logger.warn('Invalid changeType in list:update from user:', userId);
        return;
      }

      // אימות שהשולח בעלים
      const role = await ApiService.checkRole(data.listId, userId, socket.accessToken!);
      if (role !== 'owner') {
        logger.warn(`User ${userId} attempted list:update without ownership (role: ${role})`);
        return;
      }

      // שימוש ב-changeType ו-newName כמפתחות - הקליינט מרנדר בשפה הנכונה
      const notification: NotificationData = {
        id: generateNotificationId(userId),
        type: 'list_update',
        listId: data.listId,
        userId,
        userName, // מהטוקן, לא מהקליינט
        message: `list_update:${data.changeType || 'general'}`,
        timestamp: new Date(),
        changeType: data.changeType,
        newName: data.newName,
      };

      socket.to(`list:${data.listId}`).emit('notification:new', notification);

      // שידור list:updated כדי שהקליינטים ירענו את נתוני הרשימה
      socket.to(`list:${data.listId}`).emit('list:updated', {
        listId: data.listId,
        changes: {},
        userId,
        timestamp: new Date(),
      });

      logger.debug(`User ${userName} updated list ${data.listName} (${data.changeType || 'general'})`);
    } catch (error) {
      logger.error('Error in list:update handler:', error);
    }
  });

  // מחיקת רשימה ע"י בעלים
  socket.on('list:delete', async (data: { listId: string; listName: string; memberIds: string[]; ownerName: string }, callback?: () => void) => {
    try {
      if (!checkRateLimit(socket.id)) {
        if (typeof callback === 'function') callback();
        return;
      }
      if (!isValidString(data?.listId) || !isValidString(data?.listName) || !Array.isArray(data?.memberIds)) {
        logger.warn('Invalid list:delete data from user:', userId);
        if (typeof callback === 'function') callback();
        return;
      }
      // הגבלת כמות memberIds למניעת ניצול לרעה
      if (data.memberIds.length > 100) {
        logger.warn(`list:delete memberIds too large (${data.memberIds.length}) from user:`, userId);
        if (typeof callback === 'function') callback();
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) {
        if (typeof callback === 'function') callback();
        return;
      }

      // אימות שהשולח בעלים
      const role = await ApiService.checkRole(data.listId, userId, socket.accessToken!);
      if (role !== 'owner') {
        logger.warn(`User ${userId} attempted list:delete without ownership (role: ${role})`);
        if (typeof callback === 'function') callback();
        return;
      }

      const deletedData: ListDeletedData = {
        listId: data.listId,
        listName: data.listName,
        ownerId: userId,
        ownerName: userName, // מהטוקן, לא מהקליינט
        timestamp: new Date(),
      };

      // שליחת התראה לכל חבר בנפרד (ייתכן שכבר לא בחדר)
      for (const memberId of data.memberIds) {
        if (typeof memberId !== 'string' || !memberId) continue;
        io.to(`user:${memberId}`).emit('list:deleted', deletedData);
      }

      // ניקוי מעקב נוכחות לרשימה שנמחקה
      cleanupListSockets(data.listId);

      logger.debug(`List ${data.listName} was deleted by ${userName}, notified ${data.memberIds.length} members`);

      // אישור לקליינט כדי שיוכל להמשיך בבטחה למחיקה ב-API
      if (typeof callback === 'function') callback();
    } catch (error) {
      logger.error('Error in list:delete handler:', error);
      // עדיין לאשר כדי שהקליינט לא ייתקע
      if (typeof callback === 'function') callback();
    }
  });
};
