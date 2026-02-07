import { useState, useEffect } from 'react';
import { socketService } from '../../../services/socket';

/**
 * Hook to track all currently connected users in real-time.
 * Subscribes to admin presence events and returns a Set of online userIds.
 * Automatically cleans up subscription when unmounted.
 */
export function useOnlineUsers(): Set<string> {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Request the full list of online users and subscribe to updates
    socketService.requestOnlineUsers();

    // Initial full list
    const unsubAll = socketService.on<{ userIds: string[] }>('admin:online-users', (data) => {
      setOnlineUserIds(new Set(data.userIds));
    });

    // User came online
    const unsubConnected = socketService.on<{ userId: string }>('admin:user-connected', (data) => {
      setOnlineUserIds(prev => {
        if (prev.has(data.userId)) return prev;
        const next = new Set(prev);
        next.add(data.userId);
        return next;
      });
    });

    // User went offline
    const unsubDisconnected = socketService.on<{ userId: string }>('admin:user-disconnected', (data) => {
      setOnlineUserIds(prev => {
        if (!prev.has(data.userId)) return prev;
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    return () => {
      unsubAll();
      unsubConnected();
      unsubDisconnected();
      socketService.leaveOnlineUsers();
    };
  }, []);

  return onlineUserIds;
}
