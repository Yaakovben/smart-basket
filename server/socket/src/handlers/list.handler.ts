import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types';
import { ApiService } from '../services/api.service';

// Track socket connections per user per list
// Structure: listId → userId → Set<socketId>
// This correctly handles multiple connections (tabs/devices) per user
const listUserSockets = new Map<string, Map<string, Set<string>>>();

// Add a socket connection for a user in a list
// Returns true if this is the user's first connection to this list
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
  return isNewUser;
};

// Remove a socket connection for a user in a list
// Returns true if the user has no more connections (fully offline from this list)
const removeUserSocket = (listId: string, userId: string, socketId: string): boolean => {
  const userMap = listUserSockets.get(listId);
  if (!userMap) return false;
  const sockets = userMap.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    userMap.delete(userId);
    // Clean up empty list entries to prevent memory leaks
    if (userMap.size === 0) {
      listUserSockets.delete(listId);
    }
    return true;
  }
  return false;
};

// Get online user IDs for a list
const getOnlineUserIds = (listId: string): string[] => {
  const userMap = listUserSockets.get(listId);
  return userMap ? Array.from(userMap.keys()) : [];
};

export const registerListHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  const userId = socket.userId!;

  // Join a list room (with membership verification)
  socket.on('join:list', async (listId: string) => {
    if (typeof listId !== 'string' || !listId) return;

    // Verify user is a member of this list via API
    const isMember = await ApiService.verifyMembership(listId, socket.accessToken!);
    if (!isMember) {
      return;
    }

    socket.join(`list:${listId}`);
    const isNewUser = addUserSocket(listId, userId, socket.id);

    // Send current online users to the joining socket
    socket.emit('presence:online', {
      listId,
      userIds: getOnlineUserIds(listId),
    });

    // Notify others only if this is a new user (not a second tab/reconnection)
    if (isNewUser) {
      socket.to(`list:${listId}`).emit('user:joined', {
        listId,
        userId,
        userName: socket.userName || 'Unknown',
        timestamp: new Date(),
      });
    }
  });

  // Leave a list room
  socket.on('leave:list', (listId: string) => {
    if (typeof listId !== 'string' || !listId) return;

    socket.leave(`list:${listId}`);
    const isFullyOffline = removeUserSocket(listId, userId, socket.id);

    console.log(`User ${userId} left list ${listId} (socket ${socket.id})`);

    // Notify others only if user has no more active connections
    if (isFullyOffline) {
      socket.to(`list:${listId}`).emit('user:left', {
        listId,
        userId,
        userName: socket.userName || 'Unknown',
        timestamp: new Date(),
      });
    }
  });

  // Request presence for specific lists
  socket.on('get:presence', (listIds: string[]) => {
    if (!Array.isArray(listIds)) return;
    for (const listId of listIds) {
      if (typeof listId !== 'string' || !listId) continue;
      socket.emit('presence:online', {
        listId,
        userIds: getOnlineUserIds(listId),
      });
    }
  });

  // Handle disconnect - remove this socket from all lists
  socket.on('disconnect', () => {
    // Copy entries to safely modify the Map during iteration
    const entries = Array.from(listUserSockets.entries());
    for (const [listId] of entries) {
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
  });
};

// Helper to get active users in a list
export const getListUsers = (listId: string): string[] => {
  return getOnlineUserIds(listId);
};
