import { useState, useCallback, useEffect, useRef } from 'react';
import { notificationsApi, type PersistedNotification } from '../../services/api';
import type { User } from '../types';
import type { LocalNotification } from './useSocketNotifications';

export interface InitialNotificationsData {
  notifications: PersistedNotification[];
  unreadCount: number;
}

/**
 * ניהול התראות מ-API ומאירועי socket בזמן אמת.
 * טוען התראות שמורות, ממזג עם התראות חיות, ומספק פונקציות סימון כנקראו.
 * תומך בנתונים שנטענו מראש לטעינה ראשונית מהירה יותר.
 */
export function useNotifications(user: User | null, initialData?: InitialNotificationsData | null) {
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
      const result = await notificationsApi.getNotifications({ limit: 50 });
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
  useEffect(() => {
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
    }
  }, [user?.id, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // עדכון אופטימיסטי
      setPersistedNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      await notificationsApi.markAsRead(notificationId);
    } catch (error) {
      // התעלמות מ-404 (ההתראה לא קיימת ב-DB - ה-state המקומי כבר עודכן)
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 404) return;
      // שחזור בשגיאות אחרות
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async (listId?: string) => {
    try {
      // עדכון אופטימיסטי
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
    const persistedFormat: PersistedNotification = {
      id: notification.id,
      type: notification.type === 'product_edit' ? 'product_update' :
            notification.type === 'product_add' ? 'product_add' :
            notification.type === 'product_delete' ? 'product_delete' :
            notification.type === 'product_purchase' ? 'product_purchase' :
            notification.type === 'product_unpurchase' ? 'product_unpurchase' :
            notification.type,
      listId: notification.listId,
      listName: notification.listName,
      actorId: notification.userId,
      actorName: notification.userName,
      productId: undefined,
      productName: notification.productName,
      read: notification.read,
      createdAt: notification.timestamp.toISOString(),
    };

    setPersistedNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) return prev;
      const newList = [persistedFormat, ...prev];
      return newList.slice(0, 50);
    });

    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
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
