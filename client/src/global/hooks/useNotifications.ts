import { useState, useCallback, useEffect } from 'react';
import { notificationsApi, type PersistedNotification } from '../../services/api';
import type { User } from '../types';
import type { LocalNotification } from './useSocketNotifications';

/**
 * Hook to manage notifications from both API and real-time socket events.
 * - Loads persisted notifications from API on mount
 * - Merges with real-time socket notifications
 * - Provides functions to mark as read
 */
export function useNotifications(user: User | null) {
  const [persistedNotifications, setPersistedNotifications] = useState<PersistedNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load on mount and when user changes
  useEffect(() => {
    if (user) {
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
      console.error('Failed to mark notification as read:', error);
      // Revert on error
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
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
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
