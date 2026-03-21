import { useState, useCallback, useEffect, useRef } from 'react';
import { notificationsApi, type PersistedNotification } from '../../services/api';
import type { User } from '../types';
import type { LocalNotification } from './useSocketNotifications';

// בדיקת כפילות לפי תוכן (מונע כפילויות מ-reconnect של socket או חפיפה עם DB)
const DEDUP_WINDOW_MS = 10000;
const isContentDuplicate = (
  existing: PersistedNotification[],
  listId: string,
  type: string,
  actorId: string,
  productName: string | undefined,
  timestamp: number
): boolean => existing.some(n =>
  n.listId === listId &&
  n.type === type &&
  n.actorId === actorId &&
  n.productName === productName &&
  Math.abs(new Date(n.createdAt).getTime() - timestamp) < DEDUP_WINDOW_MS
);

export interface InitialNotificationsData {
  notifications: PersistedNotification[];
  unreadCount: number;
}

/**
 * ניהול התראות מ-API ומאירועי socket בזמן אמת.
 * טוען התראות שמורות, ממזג עם התראות חיות, ומספק פונקציות סימון כנקראו.
 * תומך בנתונים שנטענו מראש לטעינה ראשונית מהירה יותר.
 */
export function useNotifications(user: User | null, initialData?: InitialNotificationsData | null, authLoading?: boolean) {
  // שימוש בנתונים שנטענו מראש לרינדור מיידי
  const [persistedNotifications, setPersistedNotifications] = useState<PersistedNotification[]>(
    () => initialData?.notifications || []
  );
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => initialData?.unreadCount || 0);
  const initializedForRef = useRef<string | null>(initialData ? '__initial__' : null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setFetchError(false);
    try {
      const result = await notificationsApi.getNotifications({ limit: 50, unreadOnly: true });
      setPersistedNotifications(result.notifications);
      const count = result.notifications.filter(n => !n.read).length;
      setUnreadCount(count);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // סנכרון עם נתונים שנטענו מראש מ-useAuth
  useEffect(() => {
    if (initialData && !initializedForRef.current) {
      setPersistedNotifications(initialData.notifications);
      setUnreadCount(initialData.unreadCount);
      initializedForRef.current = '__initial__';
    }
  }, [initialData]);

  // טעינה בעליה ובהחלפת משתמש (דילוג אם כבר אותחל עם נתונים מראש)
  // לא טוענים בזמן אימות ראשוני - מחכים לנתונים שנטענו מראש מ-useAuth
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (initializedForRef.current && initializedForRef.current !== user.id) {
        initializedForRef.current = null;
      }
      if (initializedForRef.current) {
        initializedForRef.current = user.id;
        return;
      }
      initializedForRef.current = user.id;
      fetchNotifications();
    } else {
      initializedForRef.current = null;
      setPersistedNotifications([]);
      setUnreadCount(0);
      setFetchError(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // עדכון מקומי מיידי
    let wasUnread = false;
    setPersistedNotifications(prev =>
      prev.map(n => {
        if (n.id === notificationId && !n.read) {
          wasUnread = true;
          return { ...n, read: true };
        }
        return n;
      })
    );
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));

    // התראות מקומיות (מ-socket) אינן קיימות ב-DB, דילוג על קריאת API
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(notificationId);
    if (!isObjectId) return;

    try {
      await notificationsApi.markAsRead(notificationId);
    } catch (error) {
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 404) return;
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async (listId?: string) => {
    try {
      // עדכון מקומי מיידי (סימון קריאה הוא פעולה קלה שלא צריכה להמתין לשרת)
      setPersistedNotifications(prev => {
        if (!listId) {
          setUnreadCount(0);
        } else {
          const listUnread = prev.filter(n => n.listId === listId && !n.read).length;
          setUnreadCount(c => Math.max(0, c - listUnread));
        }
        return prev.map(n => (!listId || n.listId === listId) ? { ...n, read: true } : n);
      });

      await notificationsApi.markAllAsRead(listId);
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // הוספת התראה חדשה מ-socket לרשימה המקומית
  const addNotification = useCallback((notification: LocalNotification) => {
    const mappedType = notification.type === 'product_edit' ? 'product_update' : notification.type;
    const persistedFormat: PersistedNotification = {
      id: notification.id,
      type: mappedType,
      listId: notification.listId,
      listName: notification.listName,
      actorId: notification.userId,
      actorName: notification.userName,
      productId: undefined,
      productName: notification.productName,
      read: notification.read,
      createdAt: notification.timestamp.toISOString(),
    };

    const notifTime = notification.timestamp.getTime();

    setPersistedNotifications(prev => {
      // בדיקת כפילות לפי ID
      if (prev.some(n => n.id === notification.id)) return prev;

      // בדיקת כפילות לפי תוכן (מונע כפילויות מ-reconnect או מ-DB + socket)
      if (isContentDuplicate(prev, notification.listId, mappedType, notification.userId, notification.productName, notifTime)) {
        return prev;
      }

      // התראה חדשה, עדכון ספירה מתוך ה-callback לסנכרון מושלם
      if (!notification.read) {
        setUnreadCount(c => c + 1);
      }

      const newList = [persistedFormat, ...prev];
      return newList.slice(0, 50);
    });
  }, []);

  const getUnreadCountForList = useCallback((listId: string) => {
    return persistedNotifications.filter(n => n.listId === listId && !n.read).length;
  }, [persistedNotifications]);

  return {
    notifications: persistedNotifications,
    loading,
    fetchError,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    getUnreadCountForList,
  };
}
