import { useEffect, useCallback } from 'react';
import { socketService } from '../../services/socket';
import { useSettings } from '../context/SettingsContext';
import type { User, ToastType } from '../types';

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
  type: 'join' | 'leave' | 'removed';
  listId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

interface MemberRemovedEventData {
  listId: string;
  listName: string;
  removedUserId: string;
  removedUserName: string;
  adminId: string;
  adminName: string;
  timestamp: Date;
}

interface ListDeletedEventData {
  listId: string;
  listName: string;
  ownerId: string;
  ownerName: string;
  timestamp: Date;
}

// Local notification for the popup panel
export interface LocalNotification {
  id: string;
  type: 'product_add' | 'product_edit' | 'product_delete' | 'product_purchase' | 'join' | 'leave' | 'removed' | 'list_deleted';
  listId: string;
  listName: string;
  userId: string;
  userName: string;
  productName?: string;
  isPurchased?: boolean;
  timestamp: Date;
  read: boolean;
}

export function useSocketNotifications(
  user: User | null,
  showToast: (message: string, type?: ToastType) => void,
  listNames: Record<string, string> = {},
  addNotification?: (notification: LocalNotification) => void,
  onMemberRemoved?: (listId: string, listName: string) => void,
  onListDeleted?: (listId: string, listName: string) => void
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
        showToast(message, 'info');

        // Add to notifications panel
        addNotification?.({
          id: `notif_${Date.now()}_${event.userId}`,
          type: 'product_add',
          listId: event.listId,
          listName,
          userId: event.userId,
          userName: event.userName,
          productName,
          timestamp: new Date(),
          read: false
        });
      }
    });

    // Product updated notification
    const unsubProductUpdated = socketService.on('product:updated', (data: unknown) => {
      const event = data as ProductEventData;
      if (event.userId === user.id) return;

      if (shouldShowNotification('productEdit')) {
        const listName = listNames[event.listId] || '';
        const productName = event.product?.name || '';
        const message = `${event.userName} ${t('editedProductNotif')} "${productName}"`;
        showToast(message, 'info');

        // Add to notifications panel
        addNotification?.({
          id: `notif_${Date.now()}_${event.userId}`,
          type: 'product_edit',
          listId: event.listId,
          listName,
          userId: event.userId,
          userName: event.userName,
          productName,
          timestamp: new Date(),
          read: false
        });
      }
    });

    // Product deleted notification
    const unsubProductDeleted = socketService.on('product:deleted', (data: unknown) => {
      const event = data as ProductEventData;
      if (event.userId === user.id) return;

      if (shouldShowNotification('productDelete')) {
        const listName = listNames[event.listId] || '';
        const productName = event.productName || '';
        const message = `${event.userName} ${t('deletedProductNotif')} "${productName}"`;
        showToast(message, 'info');

        // Add to notifications panel
        addNotification?.({
          id: `notif_${Date.now()}_${event.userId}`,
          type: 'product_delete',
          listId: event.listId,
          listName,
          userId: event.userId,
          userName: event.userName,
          productName,
          timestamp: new Date(),
          read: false
        });
      }
    });

    // Product toggled notification
    const unsubProductToggled = socketService.on('product:toggled', (data: unknown) => {
      const event = data as ProductEventData;
      if (event.userId === user.id) return;

      if (shouldShowNotification('productPurchase')) {
        const listName = listNames[event.listId] || '';
        const productName = event.productName || '';
        const action = event.isPurchased ? t('purchasedNotif') : t('unmarkedPurchasedNotif');
        const message = `${event.userName} ${action} "${productName}"`;
        showToast(message, 'info');

        // Add to notifications panel
        addNotification?.({
          id: `notif_${Date.now()}_${event.userId}`,
          type: 'product_purchase',
          listId: event.listId,
          listName,
          userId: event.userId,
          userName: event.userName,
          productName,
          isPurchased: event.isPurchased,
          timestamp: new Date(),
          read: false
        });
      }
    });

    // Member join/leave notifications (real-time)
    const unsubNotificationNew = socketService.on('notification:new', (data: unknown) => {
      const event = data as NotificationEventData;
      // Don't show notification for own actions
      if (event.userId === user.id) return;

      // Check if group notifications are enabled
      if (!notificationSettings.enabled) return;

      const listName = listNames[event.listId] || '';

      if (event.type === 'join' && notificationSettings.groupJoin) {
        const message = `${event.userName} ${t('joinedGroupNotif')}${listName ? ` "${listName}"` : ''}`;
        showToast(message, 'info');

        // Add to notifications panel
        addNotification?.({
          id: event.id,
          type: 'join',
          listId: event.listId,
          listName,
          userId: event.userId,
          userName: event.userName,
          timestamp: new Date(event.timestamp),
          read: false
        });
      }

      if (event.type === 'leave' && notificationSettings.groupLeave) {
        const message = `${event.userName} ${t('leftGroupNotif')}${listName ? ` "${listName}"` : ''}`;
        showToast(message, 'info');

        // Add to notifications panel
        addNotification?.({
          id: event.id,
          type: 'leave',
          listId: event.listId,
          listName,
          userId: event.userId,
          userName: event.userName,
          timestamp: new Date(event.timestamp),
          read: false
        });
      }

      // Member was removed by admin (show to other group members)
      if (event.type === 'removed' && notificationSettings.groupLeave) {
        const message = `${event.userName} ${t('memberRemoved')}${listName ? ` "${listName}"` : ''}`;
        showToast(message, 'warning');

        // Add to notifications panel
        addNotification?.({
          id: event.id,
          type: 'removed',
          listId: event.listId,
          listName,
          userId: event.userId,
          userName: event.userName,
          timestamp: new Date(event.timestamp),
          read: false
        });
      }
    });

    // Member removed notification (when current user is removed from a group)
    const unsubMemberRemoved = socketService.on('member:removed', (data: unknown) => {
      const event = data as MemberRemovedEventData;
      // Only handle if we are the removed user
      if (event.removedUserId !== user.id) return;

      // Show toast notification with warning type for important removal
      const message = `${t('removedFromGroupNotif')} "${event.listName}"`;
      showToast(message, 'warning');

      // Call callback to remove the list from state
      onMemberRemoved?.(event.listId, event.listName);
    });

    // List deleted notification (when owner deletes a group)
    const unsubListDeleted = socketService.on('list:deleted', (data: unknown) => {
      const event = data as ListDeletedEventData;

      // Show toast notification with warning type
      const message = `${event.ownerName} ${t('deletedGroupNotif')} "${event.listName}"`;
      showToast(message, 'warning');

      // Add to notifications panel
      addNotification?.({
        id: `notif_${Date.now()}_${event.ownerId}`,
        type: 'list_deleted',
        listId: event.listId,
        listName: event.listName,
        userId: event.ownerId,
        userName: event.ownerName,
        timestamp: new Date(event.timestamp),
        read: false
      });

      // Call callback to remove the list from state
      onListDeleted?.(event.listId, event.listName);
    });

    return () => {
      unsubProductAdded();
      unsubProductUpdated();
      unsubProductDeleted();
      unsubProductToggled();
      unsubNotificationNew();
      unsubMemberRemoved();
      unsubListDeleted();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only user.id needed, not the full user object
  }, [user?.id, shouldShowNotification, showToast, t, listNames, notificationSettings, addNotification, onMemberRemoved, onListDeleted]);
}
