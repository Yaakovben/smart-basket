import { useState, useEffect, useMemo } from 'react';
import { socketService } from '../../services/socket';

interface PresenceData {
  listId: string;
  userIds: string[];
}

interface UserEventData {
  listId: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

/**
 * Hook to track online presence of users across lists.
 * Listens to presence:online (initial state on join), user:joined, and user:left events.
 * Explicitly requests presence when list IDs change to handle timing issues.
 * Returns a record of listId → array of online userIds.
 */
export function usePresence(listIds: string[] = []): Record<string, string[]> {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({});

  // Stable string key for listIds to avoid unnecessary effect re-runs
  const listIdsKey = useMemo(() => listIds.join(','), [listIds]);

  // Register socket event listeners
  useEffect(() => {
    // Initial state when joining a list room
    const unsubPresence = socketService.on<PresenceData>('presence:online', (data) => {
      setOnlineUsers(prev => ({ ...prev, [data.listId]: data.userIds }));
    });

    // User came online in a list
    const unsubJoined = socketService.on<UserEventData>('user:joined', (data) => {
      setOnlineUsers(prev => {
        const current = prev[data.listId] || [];
        if (current.includes(data.userId)) return prev;
        return { ...prev, [data.listId]: [...current, data.userId] };
      });
    });

    // User went offline from a list
    const unsubLeft = socketService.on<UserEventData>('user:left', (data) => {
      setOnlineUsers(prev => {
        const current = prev[data.listId] || [];
        const filtered = current.filter(id => id !== data.userId);
        if (filtered.length === current.length) return prev;
        return { ...prev, [data.listId]: filtered };
      });
    });

    return () => {
      unsubPresence();
      unsubJoined();
      unsubLeft();
    };
  }, []);

  // Explicitly request presence when list IDs change
  // This handles timing issues where join:list's presence:online may be missed
  useEffect(() => {
    if (!listIdsKey) return;
    const ids = listIdsKey.split(',');

    // Small delay to ensure socket is connected and rooms are joined
    const timer = setTimeout(() => {
      socketService.requestPresence(ids);
    }, 500);

    return () => clearTimeout(timer);
  }, [listIdsKey]);

  return onlineUsers;
}
