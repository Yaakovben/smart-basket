import mongoose from 'mongoose';
import { NotificationDAL, ListDAL, UserDAL } from '../dal';
import { NotFoundError } from '../errors';
import { logger } from '../config';
import type { INotificationDoc, NotificationType } from '../models';
import { PushService } from './push.service';

export interface CreateNotificationInput {
  type: NotificationType;
  listId: string;
  listName: string;
  actorId: string;
  actorName: string;
  targetUserId: string;
  productId?: string;
  productName?: string;
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  listId?: string;
  unreadOnly?: boolean;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  listId: string;
  listName: string;
  actorId: string;
  actorName: string;
  productId?: string;
  productName?: string;
  read: boolean;
  createdAt: Date;
}

export interface PaginatedNotifications {
  notifications: NotificationResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Helper to generate push notification message based on type
// Uses RLM (Right-to-Left Mark) for proper Hebrew display
const RLM = '\u200F'; // Right-to-Left Mark for proper RTL display

const generatePushMessage = (
  type: NotificationType,
  actorName: string,
  listName: string,
  productName?: string,
): { title: string; body: string } => {
  // Format: action description with actor name
  const getAction = (): string => {
    switch (type) {
      case 'join':
        return `${actorName} הצטרף/ה לקבוצה`;
      case 'leave':
        return `${actorName} עזב/ה את הקבוצה`;
      case 'removed':
        return `${actorName} הוסר/ה מהקבוצה`;
      case 'member_removed':
        return `הוסרת מהקבוצה על ידי ${actorName}`;
      case 'list_deleted':
        return `${actorName} מחק/ה את הקבוצה`;
      case 'product_add':
        return `${actorName} הוסיף/ה "${productName}"`;
      case 'product_update':
        return `${actorName} עדכן/ה "${productName}"`;
      case 'product_delete':
        return `${actorName} מחק/ה "${productName}"`;
      case 'product_purchase':
        return `${actorName} סימן/ה "${productName}" כנקנה`;
      case 'product_unpurchase':
        return `${actorName} החזיר/ה "${productName}" לרשימה`;
      case 'list_update': {
        // productName encodes change type and optional new name as "changeType:newName" or just "changeType"
        const [changeType, newName] = productName?.includes(':')
          ? [productName.split(':')[0], productName.split(':').slice(1).join(':')]
          : [productName, undefined];
        if (changeType === 'name' && newName) {
          return `${actorName} שינה/תה את שם הרשימה ל-"${newName}"`;
        } else if (changeType === 'design') {
          return `${actorName} שינה/תה את עיצוב הרשימה`;
        } else if (changeType === 'both' && newName) {
          return `${actorName} עדכן/ה את הרשימה ל-"${newName}"`;
        }
        return `${actorName} עדכן/ה את הרשימה`;
      }
      default:
        return `פעילות חדשה`;
    }
  };

  // Title: list emoji + list name
  // Body: action only
  // This prevents ugly empty gap above "from" line
  return {
    title: `📋 ${RLM}${listName}`,
    body: `${RLM}${getAction()}`,
  };
};

// Helper to transform notification to response format
const transformNotification = (notification: INotificationDoc): NotificationResponse => {
  const json = notification.toJSON() as Record<string, unknown>;
  return {
    id: json.id as string,
    type: json.type as NotificationType,
    listId: (json.listId as { toString: () => string }).toString(),
    listName: json.listName as string,
    actorId: (json.actorId as { toString: () => string }).toString(),
    actorName: json.actorName as string,
    productId: json.productId ? (json.productId as { toString: () => string }).toString() : undefined,
    productName: json.productName as string | undefined,
    read: json.read as boolean,
    createdAt: json.createdAt as Date,
  };
};

export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(
    data: CreateNotificationInput
  ): Promise<NotificationResponse> {
    const notification = await NotificationDAL.createNotification({
      type: data.type,
      listId: data.listId,
      listName: data.listName,
      actorId: data.actorId,
      actorName: data.actorName,
      targetUserId: data.targetUserId,
      productId: data.productId,
      productName: data.productName,
    });

    // Send push notification (async, don't wait)
    const pushMessage = generatePushMessage(data.type, data.actorName, data.listName, data.productName);
    PushService.sendToUser(data.targetUserId, {
      ...pushMessage,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: {
        listId: data.listId,
        type: data.type,
        url: `/list/${data.listId}`,
      },
    }).catch((err) => logger.warn('Push notification failed:', err));

    return transformNotification(notification);
  }

  /**
   * Create notifications for all members of a list (except the actor)
   */
  static async createNotificationsForListMembers(
    listId: string,
    type: NotificationType,
    actorId: string,
    data: {
      productId?: string;
      productName?: string;
      excludeUserId?: string; // Additional user to exclude (e.g., the person who removed a member)
    } = {}
  ): Promise<NotificationResponse[]> {
    const list = await ListDAL.findById(listId);
    if (!list) {
      throw NotFoundError.list();
    }

    const actor = await UserDAL.findById(actorId);
    if (!actor) {
      throw NotFoundError.user();
    }

    // Users to exclude: the actor and optionally another user (e.g., the remover)
    const excludeIds = new Set([actorId]);
    if (data.excludeUserId) {
      excludeIds.add(data.excludeUserId);
    }

    // Get all members who should receive the notification (everyone except excluded users)
    const targetUserIds: string[] = [];

    // Add owner if not excluded
    if (!excludeIds.has(list.owner.toString())) {
      targetUserIds.push(list.owner.toString());
    }

    // Add members if not excluded
    for (const member of list.members) {
      if (!excludeIds.has(member.user.toString())) {
        targetUserIds.push(member.user.toString());
      }
    }

    if (targetUserIds.length === 0) {
      return [];
    }

    // Filter out users who have muted this group (skip push + DB notifications)
    // Critical events (deletion, removal) are always sent regardless of mute status
    const criticalTypes: NotificationType[] = ['list_deleted', 'removed', 'member_removed'];
    let activeTargetIds = targetUserIds;

    if (!criticalTypes.includes(type)) {
      const mutedUserIds = await UserDAL.findUserIdsWhoMutedGroup(listId, targetUserIds);
      const mutedSet = new Set(mutedUserIds);
      activeTargetIds = targetUserIds.filter(id => !mutedSet.has(id));

      if (activeTargetIds.length === 0) {
        return [];
      }
    }

    // Create notifications for all target users
    const notificationsData = activeTargetIds.map((targetUserId) => ({
      type,
      listId,
      listName: list.name,
      actorId,
      actorName: actor.name,
      targetUserId,
      productId: data.productId,
      productName: data.productName,
    }));

    const notifications = await NotificationDAL.createMany(notificationsData);

    // Send push notifications to all target users (async, don't wait)
    const pushMessage = generatePushMessage(type, actor.name, list.name, data.productName);
    PushService.sendToUsers(activeTargetIds, {
      ...pushMessage,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: {
        listId,
        type,
        url: `/list/${listId}`,
      },
    }).catch((err) => logger.warn('Push notification failed:', err));

    return notifications.map((n) => transformNotification(n));
  }

  /**
   * Get notifications for a user with pagination
   */
  static async getUserNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<PaginatedNotifications> {
    const { page = 1, limit = 50, listId, unreadOnly = false } = options;

    const result = await NotificationDAL.findByUser(userId, {
      page,
      limit,
      listId,
      unreadOnly,
    });

    return {
      notifications: result.notifications.map(transformNotification),
      pagination: {
        total: result.total,
        page,
        limit,
        pages: result.pages,
      },
    };
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string, listId?: string): Promise<number> {
    return NotificationDAL.countUnread(userId, listId);
  }

  /**
   * Mark a single notification as read by ID only
   * (Used when list access was already verified)
   */
  static async markAsReadById(notificationId: string): Promise<void> {
    await NotificationDAL.markAsRead(notificationId);
  }

  /**
   * Mark a single notification as read (with ownership verification)
   */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<NotificationResponse> {
    // First verify the notification belongs to the user
    const notification = await NotificationDAL.findOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      targetUserId: new mongoose.Types.ObjectId(userId),
    });

    if (!notification) {
      throw NotFoundError.notification();
    }

    notification.read = true;
    await notification.save();

    return transformNotification(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string, listId?: string): Promise<number> {
    return NotificationDAL.markAllAsRead(userId, listId);
  }

  /**
   * Delete notifications for a specific list (used when list is deleted)
   */
  static async deleteNotificationsForList(listId: string): Promise<number> {
    return NotificationDAL.deleteByListId(listId);
  }

  /**
   * Delete old notifications (manual cleanup if needed, TTL index handles this automatically)
   */
  static async deleteOldNotifications(days: number): Promise<number> {
    return NotificationDAL.deleteOldNotifications(days);
  }
}
