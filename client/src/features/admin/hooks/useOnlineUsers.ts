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
    // בקשת רשימת משתמשים מקוונים
    socketService.requestOnlineUsers();

    // רשימה מלאה ראשונית
    const unsubAll = socketService.on<{ userIds: string[] }>('admin:online-users', (data) => {
      setOnlineUserIds(new Set(data.userIds));
    });

    // משתמש התחבר
    const unsubConnected = socketService.on<{ userId: string }>('admin:user-connected', (data) => {
      setOnlineUserIds(prev => {
        if (prev.has(data.userId)) return prev;
        const next = new Set(prev);
        next.add(data.userId);
        return next;
      });
    });

    // משתמש התנתק
    const unsubDisconnected = socketService.on<{ userId: string }>('admin:user-disconnected', (data) => {
      setOnlineUserIds(prev => {
        if (!prev.has(data.userId)) return prev;
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // בקשה מחדש ב-reconnect
    const unsubReconnect = socketService.on('connect', () => {
      socketService.requestOnlineUsers();
    });

    return () => {
      unsubAll();
      unsubConnected();
      unsubDisconnected();
      unsubReconnect();
      socketService.leaveOnlineUsers();
    };
  }, []);

  return onlineUserIds;
}
