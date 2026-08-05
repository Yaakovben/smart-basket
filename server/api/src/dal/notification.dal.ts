import mongoose, { type ClientSession } from 'mongoose';
import { Notification, type INotificationDoc, type NotificationType } from '../models';
import { createBaseDal } from './base.dal';

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

export interface PaginationOptions {
  page?: number;
  limit?: number;
  listId?: string;
  unreadOnly?: boolean;
}

export const NotificationDAL = {
  ...createBaseDal<INotificationDoc>(Notification),

  async findByUser(userId: string, options: PaginationOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { targetUserId: userId };
    if (options.listId) filter.listId = options.listId;
    if (options.unreadOnly) filter.read = false;

    const [notifications, total] = await Promise.all([
      Notification
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return {
      notifications,
      total,
      pages: Math.ceil(total / limit),
    };
  },

  async countUnread(userId: string, listId?: string): Promise<number> {
    const filter: Record<string, unknown> = { targetUserId: userId, read: false };
    if (listId) filter.listId = listId;
    return Notification.countDocuments(filter);
  },

  async markAsRead(notificationId: string): Promise<INotificationDoc | null> {
    return Notification.findByIdAndUpdate(notificationId, { read: true }, { new: true });
  },

  async markAllAsRead(userId: string, listId?: string): Promise<number> {
    const filter: Record<string, unknown> = { targetUserId: userId, read: false };
    if (listId) filter.listId = listId;

    const result = await Notification.updateMany(filter, { read: true });
    return result.modifiedCount;
  },

  async createNotification(input: CreateNotificationInput): Promise<INotificationDoc> {
    return Notification.create(input) as Promise<INotificationDoc>;
  },

  async createMany(notifications: CreateNotificationInput[]): Promise<INotificationDoc[]> {
    const docs = await Notification.insertMany(notifications);
    return docs as unknown as INotificationDoc[];
  },

  async deleteByListId(listId: string): Promise<number> {
    const result = await Notification.deleteMany({ listId });
    return result.deletedCount;
  },

  async deleteOldNotifications(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Notification.deleteMany({ createdAt: { $lt: cutoffDate } });
    return result.deletedCount;
  },

  async deleteByUserId(userId: string, session: ClientSession): Promise<number> {
    const uid = new mongoose.Types.ObjectId(userId);
    const result = await Notification.deleteMany(
      { $or: [{ actorId: uid }, { targetUserId: uid }] },
      { session }
    );
    return result.deletedCount;
  },
};
