import { useEffect, useCallback } from 'react';
import { socketService } from '../../services/socket';
import { useSettings } from '../context/SettingsContext';
import type { User } from '../types';

interface ProductEventData {
  listId: string;
  product?: { id: string; name: string };
  productId?: string;
  productName?: string;
  isPurchased?: boolean;
  userId: string;
  userName: string;
}

interface NotificationEventData {
  id: string;
  type: 'join' | 'leave';
  listId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

export function useSocketNotifications(
  user: User | null,
  showToast: (message: string) => void,
  listNames: Record<string, string> = {}
) {
  const { settings, t } = useSettings();
  const notificationSettings = settings.notifications;

  const shouldShowNotification = useCallback((
    eventType: 'productAdd' | 'productDelete' | 'productEdit' | 'productPurchase'
  ): boolean => {
    if (!notificationSettings.enabled) return false;
    return notificationSettings[eventType] ?? false;
  }, [notificationSettings]);

  useEffect(() => {
    if (!user) return;

    // Product added notification
    const unsubProductAdded = socketService.on('product:added', (data: unknown) => {
      const event = data as ProductEventData;
      // Don't show notification for own actions
      if (event.userId === user.id) return;

      if (shouldShowNotification('productAdd')) {
        const listName = listNames[event.listId] || '';
        const productName = event.product?.name || '';
        const message = `${event.userName} ${t('addedProductNotif')} "${productName}"${listName ? ` ${t('inListNotif')} ${listName}` : ''}`;
        showToast(message);
      }
    });

    // Product updated notification
    const unsubProductUpdated = socketService.on('product:updated', (data: unknown) => {
      const event = data as ProductEventData;
      if (event.userId === user.id) return;

      if (shouldShowNotification('productEdit')) {
        const productName = event.product?.name || '';
        const message = `${event.userName} ${t('editedProductNotif')} "${productName}"`;
        showToast(message);
      }
    });

    // Product deleted notification
    const unsubProductDeleted = socketService.on('product:deleted', (data: unknown) => {
      const event = data as ProductEventData;
      if (event.userId === user.id) return;

      if (shouldShowNotification('productDelete')) {
        const productName = event.productName || '';
        const message = `${event.userName} ${t('deletedProductNotif')} "${productName}"`;
        showToast(message);
      }
    });

    // Product toggled notification
    const unsubProductToggled = socketService.on('product:toggled', (data: unknown) => {
      const event = data as ProductEventData;
      if (event.userId === user.id) return;

      if (shouldShowNotification('productPurchase')) {
        const productName = event.productName || '';
        const action = event.isPurchased ? t('purchasedNotif') : t('unmarkedPurchasedNotif');
        const message = `${event.userName} ${action} "${productName}"`;
        showToast(message);
      }
    });

    // Member join/leave notifications (real-time)
    const unsubNotificationNew = socketService.on('notification:new', (data: unknown) => {
      const event = data as NotificationEventData;
      // Don't show notification for own actions
      if (event.userId === user.id) return;

      // Check if group notifications are enabled
      if (!notificationSettings.enabled) return;

      if (event.type === 'join' && notificationSettings.groupJoin) {
        const listName = listNames[event.listId] || '';
        const message = `${event.userName} ${t('joinedGroupNotif')}${listName ? ` "${listName}"` : ''}`;
        showToast(message);
      }

      if (event.type === 'leave' && notificationSettings.groupLeave) {
        const listName = listNames[event.listId] || '';
        const message = `${event.userName} ${t('leftGroupNotif')}${listName ? ` "${listName}"` : ''}`;
        showToast(message);
      }
    });

    return () => {
      unsubProductAdded();
      unsubProductUpdated();
      unsubProductDeleted();
      unsubProductToggled();
      unsubNotificationNew();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only user.id needed, not the full user object
  }, [user?.id, shouldShowNotification, showToast, t, listNames]);
}
