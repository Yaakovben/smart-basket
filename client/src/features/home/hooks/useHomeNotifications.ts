import { useState, useMemo, useCallback } from 'react';
import type { LocalNotification } from '../../../global/hooks';
import type { PersistedNotification } from '../../../services/api';

// המרת התראות שמורות (מה-API) לפורמט תצוגה של מסך הבית + ניהול אנימציית סגירה.
export function useHomeNotifications(
  persistedNotifications: PersistedNotification[],
  onMarkPersistedNotificationRead?: (notificationId: string) => void,
  onClearAllPersistedNotifications?: (listId?: string) => void,
) {
  // מעקב אחר התראות שנסגרות (לצורך אנימציה)
  const [dismissingNotifications, setDismissingNotifications] = useState<Set<string>>(new Set());

  // המרת התראות שמורות לפורמט תצוגה
  const allNotifications = useMemo(() => {
    return persistedNotifications
      .filter(n => !n.read)
      .map(n => ({
        id: n.id,
        type: (n.type === 'product_update' ? 'product_edit' : n.type) as LocalNotification['type'],
        listId: n.listId,
        listName: n.listName,
        userId: n.actorId,
        userName: n.actorName,
        timestamp: new Date(n.createdAt),
        read: n.read,
        isLocal: false,
        productName: n.productName,
        isPurchased: n.type === 'product_purchase' ? true : n.type === 'product_unpurchase' ? false : undefined
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [persistedNotifications]);

  // חישוב סה"כ לא נקראו
  const totalUnreadCount = allNotifications.length;

  const handleDismissNotification = useCallback((_listId: string, notificationId: string) => {
    // הוספה לסט נסגרות להפעלת אנימציה
    setDismissingNotifications(prev => new Set(prev).add(notificationId));

    // סימון כנקראה
    onMarkPersistedNotificationRead?.(notificationId);

    // ניקוי מסט נסגרות לאחר סיום אנימציה
    setTimeout(() => {
      setDismissingNotifications(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }, 600);
  }, [onMarkPersistedNotificationRead]);

  const handleMarkAllRead = useCallback(() => {
    onClearAllPersistedNotifications?.();
  }, [onClearAllPersistedNotifications]);

  return {
    allNotifications,
    totalUnreadCount,
    dismissingNotifications,
    handleDismissNotification,
    handleMarkAllRead,
  };
}
