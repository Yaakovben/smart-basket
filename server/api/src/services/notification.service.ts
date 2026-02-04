import mongoose from 'mongoose';
import { Notification, type INotification, type NotificationType } from '../models/Notification.model';
import { List, User } from '../models';
import { ApiError } from '../utils';
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
// Title = Smart Basket (top), Body = list name + action (below)
const generatePushMessage = (
  type: NotificationType,
  actorName: string,
  listName: string,
  productName?: string
): { title: string; body: string } => {
  const getAction = (): string => {
    switch (type) {
      case 'join':
        return `${actorName} הצטרף/ה לקבוצה`;
      case 'leave':
        return `${actorName} עזב/ה את הקבוצה`;
      case 'removed':
        return `${actorName} הוסר/ה מהקבוצה`;
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
      default:
        return `פעילות חדשה`;
    }
  };

  return {
    title: 'Smart Basket',
    body: `${listName}\n${getAction()}`,
  };
};

// Helper to transform notification to response format
const transformNotification = (notification: INotification): NotificationResponse => {
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
    const notification = await Notification.create({
      type: data.type,
      listId: new mongoose.Types.ObjectId(data.listId),
      listName: data.listName,
      actorId: new mongoose.Types.ObjectId(data.actorId),
      actorName: data.actorName,
      targetUserId: new mongoose.Types.ObjectId(data.targetUserId),
      productId: data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined,
      productName: data.productName,
      read: false,
    });

    // Send push notification (async, don't wait)
    const pushMessage = generatePushMessage(data.type, data.actorName, data.listName, data.productName);
    PushService.sendToUser(data.targetUserId, {
      ...pushMessage,
      icon: '/apple-touch-icon.svg',
      badge: '/favicon.svg',
      data: {
        listId: data.listId,
        type: data.type,
        url: `/list/${data.listId}`,
      },
    }).catch(() => {}); // Ignore push errors

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
    const list = await List.findById(listId);
    if (!list) {
      throw ApiError.notFound('List not found');
    }

    const actor = await User.findById(actorId);
    if (!actor) {
      throw ApiError.notFound('Actor not found');
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

    // Create notifications for all target users
    const notifications = await Notification.insertMany(
      targetUserIds.map((targetUserId) => ({
        type,
        listId: new mongoose.Types.ObjectId(listId),
        listName: list.name,
        actorId: new mongoose.Types.ObjectId(actorId),
        actorName: actor.name,
        targetUserId: new mongoose.Types.ObjectId(targetUserId),
        productId: data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined,
        productName: data.productName,
        read: false,
      }))
    );

    // Send push notifications to all target users (async, don't wait)
    const pushMessage = generatePushMessage(type, actor.name, list.name, data.productName);
    PushService.sendToUsers(targetUserIds, {
      ...pushMessage,
      icon: '/apple-touch-icon.svg',
      badge: '/favicon.svg',
      data: {
        listId,
        type,
        url: `/list/${listId}`,
      },
    }).catch(() => {}); // Ignore push errors

    return notifications.map((n) => transformNotification(n as INotification));
  }

  /**
   * Get notifications for a user with pagination
   */
  static async getUserNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<PaginatedNotifications> {
    const { page = 1, limit = 50, listId, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {
      targetUserId: new mongoose.Types.ObjectId(userId),
    };

    if (listId) {
      query.listId = new mongoose.Types.ObjectId(listId);
    }

    if (unreadOnly) {
      query.read = false;
    }

    // Get total count
    const total = await Notification.countDocuments(query);

    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      notifications: notifications.map(transformNotification),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string, listId?: string): Promise<number> {
    const query: Record<string, unknown> = {
      targetUserId: new mongoose.Types.ObjectId(userId),
      read: false,
    };

    if (listId) {
      query.listId = new mongoose.Types.ObjectId(listId);
    }

    return Notification.countDocuments(query);
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<NotificationResponse> {
    const notification = await Notification.findOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      targetUserId: new mongoose.Types.ObjectId(userId),
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    notification.read = true;
    await notification.save();

    return transformNotification(notification);
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string, listId?: string): Promise<number> {
    const query: Record<string, unknown> = {
      targetUserId: new mongoose.Types.ObjectId(userId),
      read: false,
    };

    if (listId) {
      query.listId = new mongoose.Types.ObjectId(listId);
    }

    const result = await Notification.updateMany(query, { read: true });

    return result.modifiedCount;
  }

  /**
   * Delete notifications for a specific list (used when list is deleted)
   */
  static async deleteNotificationsForList(listId: string): Promise<number> {
    const result = await Notification.deleteMany({
      listId: new mongoose.Types.ObjectId(listId),
    });

    return result.deletedCount;
  }

  /**
   * Delete old notifications (manual cleanup if needed, TTL index handles this automatically)
   */
  static async deleteOldNotifications(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return result.deletedCount;
  }
}
