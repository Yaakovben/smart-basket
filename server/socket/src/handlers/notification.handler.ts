import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  NotificationData,
  MemberRemovedData,
} from '../types';

// Simple validation helper
const isValidString = (val: unknown): val is string =>
  typeof val === 'string' && val.length > 0 && val.length < 500;

export const registerNotificationHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  const userId = socket.userId!;

  // Mark notifications as read
  socket.on('notification:read', (data: { listId: string; notificationId?: string }) => {
    // This is mainly for UI state - actual persistence happens via REST API
    console.log(`User ${socket.userId} marked notification as read in list ${data.listId}`);
  });

  // Member joined group
  socket.on('member:join', (data: { listId: string; listName: string; userName: string }) => {
    if (!isValidString(data?.listId) || !isValidString(data?.userName)) {
      console.warn('Invalid member:join data from user:', userId);
      return;
    }

    const notification: NotificationData = {
      id: `notif_${Date.now()}_${userId}`,
      type: 'join',
      listId: data.listId,
      userId,
      userName: data.userName,
      message: `${data.userName} joined ${data.listName}`,
      timestamp: new Date(),
    };

    // Broadcast to all users in the list except sender
    socket.to(`list:${data.listId}`).emit('notification:new', notification);
    console.log(`User ${data.userName} joined group ${data.listName}`);
  });

  // Member left group
  socket.on('member:leave', (data: { listId: string; listName: string; userName: string }) => {
    if (!isValidString(data?.listId) || !isValidString(data?.userName)) {
      console.warn('Invalid member:leave data from user:', userId);
      return;
    }

    const notification: NotificationData = {
      id: `notif_${Date.now()}_${userId}`,
      type: 'leave',
      listId: data.listId,
      userId,
      userName: data.userName,
      message: `${data.userName} left ${data.listName}`,
      timestamp: new Date(),
    };

    // Broadcast to all users in the list (including sender for confirmation, they're about to leave anyway)
    io.to(`list:${data.listId}`).emit('notification:new', notification);
    console.log(`User ${data.userName} left group ${data.listName}`);
  });

  // Member removed from group (by admin)
  socket.on('member:remove', (data: { listId: string; listName: string; removedUserId: string; removedUserName: string; adminName: string }) => {
    if (!isValidString(data?.listId) || !isValidString(data?.removedUserId) || !isValidString(data?.adminName)) {
      console.warn('Invalid member:remove data from user:', userId);
      return;
    }

    const removedData: MemberRemovedData = {
      listId: data.listId,
      listName: data.listName,
      removedUserId: data.removedUserId,
      removedUserName: data.removedUserName,
      adminId: userId,
      adminName: data.adminName,
      timestamp: new Date(),
    };

    // Send notification directly to the removed user
    io.to(`user:${data.removedUserId}`).emit('member:removed', removedData);

    // Also notify other members in the list (use 'removed' type, not 'leave')
    const removedNotification: NotificationData = {
      id: `notif_${Date.now()}_${data.removedUserId}`,
      type: 'removed',
      listId: data.listId,
      userId: data.removedUserId,
      userName: data.removedUserName,
      message: `${data.removedUserName} was removed from ${data.listName}`,
      timestamp: new Date(),
    };
    socket.to(`list:${data.listId}`).emit('notification:new', removedNotification);

    console.log(`User ${data.removedUserName} was removed from group ${data.listName} by ${data.adminName}`);
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
