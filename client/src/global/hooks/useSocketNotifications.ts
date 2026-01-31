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

    // Note: user:joined and user:left socket events are for real-time presence tracking only
    // They fire on every login/logout and socket reconnection, NOT for actual group membership changes
    // Actual group join/leave notifications are stored in the list's notifications array
    // and shown in the notifications modal, not as toasts

    return () => {
      unsubProductAdded();
      unsubProductUpdated();
      unsubProductDeleted();
      unsubProductToggled();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only user.id needed, not the full user object
  }, [user?.id, shouldShowNotification, showToast, t, listNames]);
}
