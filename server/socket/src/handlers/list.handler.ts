import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types';

// Track which users are in which lists
const listUsers = new Map<string, Set<string>>();

export const registerListHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  const userId = socket.userId!;

  // Join a list room
  socket.on('join:list', (listId: string) => {
    socket.join(`list:${listId}`);

    // Track user in list
    if (!listUsers.has(listId)) {
      listUsers.set(listId, new Set());
    }
    listUsers.get(listId)!.add(userId);

    console.log(`User ${userId} joined list ${listId}`);

    // Send current online users to the joining socket
    socket.emit('presence:online', {
      listId,
      userIds: Array.from(listUsers.get(listId)!),
    });

    // Notify others in the list
    socket.to(`list:${listId}`).emit('user:joined', {
      listId,
      userId,
      userName: socket.userName || 'Unknown',
      timestamp: new Date(),
    });
  });

  // Leave a list room
  socket.on('leave:list', (listId: string) => {
    socket.leave(`list:${listId}`);

    // Remove user from tracking
    listUsers.get(listId)?.delete(userId);

    console.log(`User ${userId} left list ${listId}`);

    // Notify others
    socket.to(`list:${listId}`).emit('user:left', {
      listId,
      userId,
      userName: socket.userName || 'Unknown',
      timestamp: new Date(),
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    // Remove user from all lists they were in
    listUsers.forEach((users, listId) => {
      if (users.has(userId)) {
        users.delete(userId);
        socket.to(`list:${listId}`).emit('user:left', {
          listId,
          userId,
          userName: socket.userName || 'Unknown',
          timestamp: new Date(),
        });
      }
    });
  });
};

// Helper to get active users in a list
export const getListUsers = (listId: string): string[] => {
  return Array.from(listUsers.get(listId) || []);
};
