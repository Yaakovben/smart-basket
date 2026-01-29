import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  NotificationData,
} from '../types';

export const registerNotificationHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  // Mark notifications as read
  socket.on('notification:read', (data: { listId: string; notificationId?: string }) => {
    // This is mainly for UI state - actual persistence happens via REST API
    console.log(`User ${socket.userId} marked notification as read in list ${data.listId}`);
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
