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

  // Mark notifications as read
  socket.on('notification:read', (data: { listId: string; notificationId?: string }) => {
    // This is mainly for UI state - actual persistence happens via REST API
    logger.info(`User ${userId} marked notification as read in list ${data.listId}`);
  });

  // Member joined group
  socket.on('member:join', (data: { listId: string; listName: string; userName: string }) => {
    if (!checkRateLimit(socket.id)) return;
    if (!isValidString(data?.listId) || !isValidString(data?.listName)) {
      logger.warn('Invalid member:join data from user:', userId);
      return;
    }
    // Verify sender is in the list room
    if (!socket.rooms.has(`list:${data.listId}`)) return;

    const notification: NotificationData = {
      id: generateNotificationId(userId),
      type: 'join',
      listId: data.listId,
      userId,
      userName, // from token, not client
      message: `${userName} joined ${data.listName}`,
      timestamp: new Date(),
    };

    socket.to(`list:${data.listId}`).emit('notification:new', notification);
    logger.info(`User ${userName} joined group ${data.listName}`);
  });

  // Member left group
  socket.on('member:leave', (data: { listId: string; listName: string; userName: string }) => {
    if (!checkRateLimit(socket.id)) return;
    if (!isValidString(data?.listId) || !isValidString(data?.listName)) {
      logger.warn('Invalid member:leave data from user:', userId);
      return;
    }
    // Verify sender is in the list room
    if (!socket.rooms.has(`list:${data.listId}`)) return;

    const notification: NotificationData = {
      id: generateNotificationId(userId),
      type: 'leave',
      listId: data.listId,
      userId,
      userName, // from token, not client
      message: `${userName} left ${data.listName}`,
      timestamp: new Date(),
    };

    // Broadcast to all users in the list (including sender - they're about to leave anyway)
    io.to(`list:${data.listId}`).emit('notification:new', notification);
    logger.info(`User ${userName} left group ${data.listName}`);
  });

  // Member removed from group (by admin/owner)
  socket.on('member:remove', async (data: { listId: string; listName: string; removedUserId: string; removedUserName: string; adminName: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId) || !isValidString(data?.removedUserId) || !isValidString(data?.listName)) {
        logger.warn('Invalid member:remove data from user:', userId);
        return;
      }
      // Verify sender is in the list room
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      // Verify sender is owner or admin (not just a member)
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
        adminName: userName, // from token, not client
        timestamp: new Date(),
      };

      // Send notification directly to the removed user
      io.to(`user:${data.removedUserId}`).emit('member:removed', removedData);

      // Also notify other members in the list
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

      logger.info(`User ${data.removedUserName} was removed from group ${data.listName} by ${userName}`);
    } catch (error) {
      logger.error('Error in member:remove handler:', error);
    }
  });

  // List settings updated by owner
  socket.on('list:update', async (data: { listId: string; listName: string; userName: string; changeType?: 'name' | 'design' | 'both'; newName?: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId)) {
        logger.warn('Invalid list:update data from user:', userId);
        return;
      }
      // Verify sender is in the list room
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      // Validate changeType if provided
      if (data.changeType && !['name', 'design', 'both'].includes(data.changeType)) {
        logger.warn('Invalid changeType in list:update from user:', userId);
        return;
      }

      // Verify sender is owner
      const role = await ApiService.checkRole(data.listId, userId, socket.accessToken!);
      if (role !== 'owner') {
        logger.warn(`User ${userId} attempted list:update without ownership (role: ${role})`);
        return;
      }

      // Use changeType and newName as notification keys - client renders in correct language
      const notification: NotificationData = {
        id: generateNotificationId(userId),
        type: 'list_update',
        listId: data.listId,
        userId,
        userName, // from token, not client
        message: `list_update:${data.changeType || 'general'}`,
        timestamp: new Date(),
        changeType: data.changeType,
        newName: data.newName,
      };

      // Broadcast to all users in the list except sender
      socket.to(`list:${data.listId}`).emit('notification:new', notification);

      // Also emit list:updated so clients refetch the list data (name/icon/color changes)
      socket.to(`list:${data.listId}`).emit('list:updated', {
        listId: data.listId,
        changes: {},
        userId,
        timestamp: new Date(),
      });

      logger.info(`User ${userName} updated list ${data.listName} (${data.changeType || 'general'})`);
    } catch (error) {
      logger.error('Error in list:update handler:', error);
    }
  });

  // List deleted by owner
  socket.on('list:delete', async (data: { listId: string; listName: string; memberIds: string[]; ownerName: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId) || !isValidString(data?.listName) || !Array.isArray(data?.memberIds)) {
        logger.warn('Invalid list:delete data from user:', userId);
        return;
      }
      // Limit memberIds to prevent abuse
      if (data.memberIds.length > 100) {
        logger.warn(`list:delete memberIds too large (${data.memberIds.length}) from user:`, userId);
        return;
      }
      // Verify sender is in the list room
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      // Verify sender is owner
      const role = await ApiService.checkRole(data.listId, userId, socket.accessToken!);
      if (role !== 'owner') {
        logger.warn(`User ${userId} attempted list:delete without ownership (role: ${role})`);
        return;
      }

      const deletedData: ListDeletedData = {
        listId: data.listId,
        listName: data.listName,
        ownerId: userId,
        ownerName: userName, // from token, not client
        timestamp: new Date(),
      };

      // Send notification to each member individually (they might not be in the room anymore)
      for (const memberId of data.memberIds) {
        io.to(`user:${memberId}`).emit('list:deleted', deletedData);
      }

      // Clean up presence tracking for deleted list
      cleanupListSockets(data.listId);

      logger.info(`List ${data.listName} was deleted by ${userName}, notified ${data.memberIds.length} members`);
    } catch (error) {
      logger.error('Error in list:delete handler:', error);
    }
  });
};

// Helper to broadcast notification to a list
export const broadcastNotification = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  listId: string,
  notification: NotificationData
) => {
  io.to(`list:${listId}`).emit('notification:new', notification);
};

// Helper to send notification to specific user
export const sendNotificationToUser = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  userId: string,
  notification: NotificationData
) => {
  io.to(`user:${userId}`).emit('notification:new', notification);
};
