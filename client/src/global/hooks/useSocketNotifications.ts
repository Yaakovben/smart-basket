import { useEffect, useCallback, useRef } from 'react';
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
  type: 'join' | 'leave' | 'removed' | 'list_update';
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
  type: 'product_add' | 'product_edit' | 'product_delete' | 'product_purchase' | 'join' | 'leave' | 'removed' | 'member_removed' | 'list_deleted' | 'list_update';
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
  onListDeleted?: (listId: string, listName: string) => void,
  isPushSubscribed = false
) {
  const { settings, t } = useSettings();
  const notificationSettings = settings.notifications;

  // Use refs for frequently-changing values to avoid re-subscribing listeners
  const showToastRef = useRef(showToast);
  const tRef = useRef(t);
  const listNamesRef = useRef(listNames);
  const addNotificationRef = useRef(addNotification);
  const onMemberRemovedRef = useRef(onMemberRemoved);
  const onListDeletedRef = useRef(onListDeleted);
  const notificationSettingsRef = useRef(notificationSettings);
  const isPushSubscribedRef = useRef(isPushSubscribed);

  // Keep refs up to date
  showToastRef.current = showToast;
  tRef.current = t;
  listNamesRef.current = listNames;
  addNotificationRef.current = addNotification;
  onMemberRemovedRef.current = onMemberRemoved;
  onListDeletedRef.current = onListDeleted;
  notificationSettingsRef.current = notificationSettings;
  isPushSubscribedRef.current = isPushSubscribed;

  const shouldShowNotification = useCallback((
    eventType: 'productAdd' | 'productDelete' | 'productEdit' | 'productPurchase'
  ): boolean => {
    const ns = notificationSettingsRef.current;
    if (!ns.enabled) return false;
    return ns[eventType] ?? false;
  }, []);

  useEffect(() => {
    if (!user) return;

    // Product added notification
    const unsubProductAdded = socketService.on('product:added', (data: unknown) => {
      const event = data as ProductEventData;
      if (event.userId === user.id) return;
      if (notificationSettingsRef.current.mutedGroupIds?.includes(event.listId)) return;

      if (shouldShowNotification('productAdd')) {
        const listName = listNamesRef.current[event.listId] || '';
        const productName = event.product?.name || event.productName || '';

        if (!isPushSubscribedRef.current) {
          const message = `${event.userName} ${tRef.current('addedProductNotif')} "${productName}"${listName ? ` ${tRef.current('inListNotif')} ${listName}` : ''}`;
          showToastRef.current(message, 'info');
        }

        addNotificationRef.current?.({
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
      if (notificationSettingsRef.current.mutedGroupIds?.includes(event.listId)) return;

      if (shouldShowNotification('productEdit')) {
        const listName = listNamesRef.current[event.listId] || '';
        const productName = event.product?.name || event.productName || '';

        if (!isPushSubscribedRef.current) {
          const message = `${event.userName} ${tRef.current('editedProductNotif')} "${productName}"`;
          showToastRef.current(message, 'info');
        }

        addNotificationRef.current?.({
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
      if (notificationSettingsRef.current.mutedGroupIds?.includes(event.listId)) return;

      if (shouldShowNotification('productDelete')) {
        const listName = listNamesRef.current[event.listId] || '';
        const productName = event.product?.name || event.productName || '';

        if (!isPushSubscribedRef.current) {
          const message = `${event.userName} ${tRef.current('deletedProductNotif')} "${productName}"`;
          showToastRef.current(message, 'info');
        }

        addNotificationRef.current?.({
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
      if (notificationSettingsRef.current.mutedGroupIds?.includes(event.listId)) return;

      if (shouldShowNotification('productPurchase')) {
        const listName = listNamesRef.current[event.listId] || '';
        const productName = event.product?.name || event.productName || '';

        if (!isPushSubscribedRef.current) {
          const action = event.isPurchased ? tRef.current('purchasedNotif') : tRef.current('unmarkedPurchasedNotif');
          const message = `${event.userName} ${action} "${productName}"`;
          showToastRef.current(message, 'info');
        }

        addNotificationRef.current?.({
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
      if (event.userId === user.id) return;
      const ns = notificationSettingsRef.current;
      if (ns.mutedGroupIds?.includes(event.listId)) return;
      if (!ns.enabled) return;

      const listName = listNamesRef.current[event.listId] || '';

      if (event.type === 'join' && ns.groupJoin) {
        if (!isPushSubscribedRef.current) {
          const message = `${event.userName} ${tRef.current('joinedGroupNotif')}${listName ? ` "${listName}"` : ''}`;
          showToastRef.current(message, 'info');
        }

        addNotificationRef.current?.({
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

      if (event.type === 'leave' && ns.groupLeave) {
        if (!isPushSubscribedRef.current) {
          const message = `${event.userName} ${tRef.current('leftGroupNotif')}${listName ? ` "${listName}"` : ''}`;
          showToastRef.current(message, 'info');
        }

        addNotificationRef.current?.({
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
      if (event.type === 'removed' && (ns.groupRemoved ?? true)) {
        if (!isPushSubscribedRef.current) {
          const message = `${event.userName} ${tRef.current('memberRemoved')}${listName ? ` "${listName}"` : ''}`;
          showToastRef.current(message, 'warning');
        }

        addNotificationRef.current?.({
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

      // List settings were updated by owner
      if (event.type === 'list_update' && ns.listUpdate) {
        if (!isPushSubscribedRef.current) {
          const message = `${event.userName} ${tRef.current('listUpdatedNotif')}${listName ? ` "${listName}"` : ''}`;
          showToastRef.current(message, 'info');
        }

        addNotificationRef.current?.({
          id: event.id,
          type: 'list_update',
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
      if (event.removedUserId !== user.id) return;

      onMemberRemovedRef.current?.(event.listId, event.listName);

      const ns = notificationSettingsRef.current;
      if (!ns.enabled) return;
      if (!(ns.groupRemoved ?? true)) return;

      if (!isPushSubscribedRef.current) {
        const message = `${tRef.current('removedFromGroupNotif')} "${event.listName}"`;
        showToastRef.current(message, 'warning');
      }
    });

    // List deleted notification (when owner deletes a group)
    const unsubListDeleted = socketService.on('list:deleted', (data: unknown) => {
      const event = data as ListDeletedEventData;

      onListDeletedRef.current?.(event.listId, event.listName);

      const ns = notificationSettingsRef.current;
      if (!ns.enabled) return;
      if (!(ns.groupDelete ?? true)) return;

      if (!isPushSubscribedRef.current) {
        const message = `${event.ownerName} ${tRef.current('deletedGroupNotif')} "${event.listName}"`;
        showToastRef.current(message, 'warning');
      }

      addNotificationRef.current?.({
        id: `notif_${Date.now()}_${event.ownerId}`,
        type: 'list_deleted',
        listId: event.listId,
        listName: event.listName,
        userId: event.ownerId,
        userName: event.ownerName,
        timestamp: new Date(event.timestamp),
        read: false
      });
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
  }, [user?.id, shouldShowNotification]);
}
