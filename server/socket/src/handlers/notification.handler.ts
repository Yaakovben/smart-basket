import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  NotificationData,
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
