import { useState, useEffect, useMemo, useCallback } from 'react';
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
 * מעקב נוכחות מקוונת של משתמשים ברשימות.
 * מאזין ל-presence:online, user:joined ו-user:left.
 * מחזיר מפה של listId → מערך userIds מקוונים.
 */
export function usePresence(listIds: string[] = []): Record<string, string[]> {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, string[]>>({});

  // מפתח יציב למניעת הפעלות מיותרות של effect
  const listIdsKey = useMemo(() => listIds.join(','), [listIds]);

  const requestPresenceIfConnected = useCallback((ids: string[]) => {
    if (socketService.isConnected()) {
      socketService.requestPresence(ids);
    }
  }, []);

  useEffect(() => {
    const unsubPresence = socketService.on<PresenceData>('presence:online', (data) => {
      setOnlineUsers(prev => ({ ...prev, [data.listId]: data.userIds }));
    });

    const unsubJoined = socketService.on<UserEventData>('user:joined', (data) => {
      setOnlineUsers(prev => {
        const current = prev[data.listId] || [];
        if (current.includes(data.userId)) return prev;
        return { ...prev, [data.listId]: [...current, data.userId] };
      });
    });

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

  // בקשת נוכחות כשרשימות משתנות או ב-reconnect
  useEffect(() => {
    if (!listIdsKey) return;
    const ids = listIdsKey.split(',');

    requestPresenceIfConnected(ids);

    const unsubConnect = socketService.on('connect', () => {
      requestPresenceIfConnected(ids);
    });

    return () => { unsubConnect(); };
  }, [listIdsKey, requestPresenceIfConnected]);

  return onlineUsers;
}
