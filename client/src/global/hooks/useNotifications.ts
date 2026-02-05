import { useState, useCallback, useEffect, useRef } from 'react';
import { notificationsApi, type PersistedNotification } from '../../services/api';
import type { User } from '../types';
import type { LocalNotification } from './useSocketNotifications';

// Initial notifications data type for parallel loading optimization
export interface InitialNotificationsData {
  notifications: PersistedNotification[];
  unreadCount: number;
}

/**
 * Hook to manage notifications from both API and real-time socket events.
 * - Loads persisted notifications from API on mount
 * - Merges with real-time socket notifications
 * - Provides functions to mark as read
 * - Accepts pre-fetched data for faster initial load
 */
export function useNotifications(user: User | null, initialData?: InitialNotificationsData | null) {
  // Use pre-fetched data if available for instant render
  const [persistedNotifications, setPersistedNotifications] = useState<PersistedNotification[]>(
    () => initialData?.notifications || []
  );
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => initialData?.unreadCount || 0);
  // Track if we've initialized from pre-fetched data
  const initializedRef = useRef(!!initialData);

  // Load notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await notificationsApi.getNotifications({ limit: 50 });
      setPersistedNotifications(result.notifications);
      // Update unread count
      const count = result.notifications.filter(n => !n.read).length;
      setUnreadCount(count);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load on mount and when user changes (skip if already initialized with pre-fetched data)
  useEffect(() => {
    if (user) {
      // Skip fetch if we already have pre-fetched data
      if (initializedRef.current) {
        initializedRef.current = false; // Reset for future refetches
        return;
      }
      fetchNotifications();
    } else {
      setPersistedNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id, fetchNotifications]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setPersistedNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Persist to API
      await notificationsApi.markAsRead(notificationId);
    } catch (error) {
      // Silently ignore 404 errors (notification doesn't exist in DB - just keep local state)
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 404) {
        // Notification doesn't exist in DB, but we already updated local state - that's fine
        return;
      }
      // Revert on other errors
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Mark all notifications as read (optionally for a specific list)
  const markAllAsRead = useCallback(async (listId?: string) => {
    try {
      // Optimistic update
      setPersistedNotifications(prev =>
        prev.map(n => (!listId || n.listId === listId) ? { ...n, read: true } : n)
      );
      setUnreadCount(0);

      // Persist to API
      await notificationsApi.markAllAsRead(listId);
    } catch {
      // Revert on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Add a new notification (from socket) to the local state
  // This is called when we receive a real-time notification
  const addNotification = useCallback((notification: LocalNotification) => {
    // Convert LocalNotification to PersistedNotification format
    const persistedFormat: PersistedNotification = {
      id: notification.id,
      type: notification.type === 'product_edit' ? 'product_update' :
            notification.type === 'product_add' ? 'product_add' :
            notification.type === 'product_delete' ? 'product_delete' :
            notification.type === 'product_purchase' ? 'product_purchase' :
            notification.type, // join or leave
      listId: notification.listId,
      listName: notification.listName,
      actorId: notification.userId,
      actorName: notification.userName,
      productId: undefined, // Not available in local notification
      productName: notification.productName,
      read: notification.read,
      createdAt: notification.timestamp.toISOString(),
    };

    setPersistedNotifications(prev => {
      // Avoid duplicates
      if (prev.some(n => n.id === notification.id)) return prev;
      // Add to beginning, keep max 50
      const newList = [persistedFormat, ...prev];
      return newList.slice(0, 50);
    });

    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Get unread count for a specific list
  const getUnreadCountForList = useCallback((listId: string) => {
    return persistedNotifications.filter(n => n.listId === listId && !n.read).length;
  }, [persistedNotifications]);

  return {
    notifications: persistedNotifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    getUnreadCountForList,
  };
}
