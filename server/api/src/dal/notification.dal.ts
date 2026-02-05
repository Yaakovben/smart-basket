import { Notification, type INotificationDoc, type NotificationType } from '../models';
import { BaseDAL } from './base.dal';

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

class NotificationDALClass extends BaseDAL<INotificationDoc> {
  constructor() {
    super(Notification);
  }

  async findByUser(userId: string, options: PaginationOptions = {}): Promise<{ notifications: INotificationDoc[]; total: number; pages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { targetUserId: userId };
    if (options.listId) filter.listId = options.listId;
    if (options.unreadOnly) filter.read = false;

    const [notifications, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    return {
      notifications,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async countUnread(userId: string, listId?: string): Promise<number> {
    const filter: Record<string, unknown> = { targetUserId: userId, read: false };
    if (listId) filter.listId = listId;
    return this.model.countDocuments(filter);
  }

  async markAsRead(notificationId: string): Promise<INotificationDoc | null> {
    return this.model.findByIdAndUpdate(notificationId, { read: true }, { new: true });
  }

  async markAllAsRead(userId: string, listId?: string): Promise<number> {
    const filter: Record<string, unknown> = { targetUserId: userId, read: false };
    if (listId) filter.listId = listId;

    const result = await this.model.updateMany(filter, { read: true });
    return result.modifiedCount;
  }

  async createNotification(input: CreateNotificationInput): Promise<INotificationDoc> {
    return this.model.create(input) as Promise<INotificationDoc>;
  }

  async createMany(notifications: CreateNotificationInput[]): Promise<INotificationDoc[]> {
    const docs = await this.model.insertMany(notifications);
    return docs as unknown as INotificationDoc[];
  }

  async deleteByListId(listId: string): Promise<number> {
    const result = await this.model.deleteMany({ listId });
    return result.deletedCount;
  }

  async deleteOldNotifications(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.model.deleteMany({ createdAt: { $lt: cutoffDate } });
    return result.deletedCount;
  }
}

export const NotificationDAL = new NotificationDALClass();
