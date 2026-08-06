import { PushSubscription, type IPushSubscription } from '../models';
import { createBaseDal } from './base.dal';
import type { ClientSession } from 'mongoose';

export const PushSubscriptionDAL = {
  ...createBaseDal<IPushSubscription>(PushSubscription),

  async findByUserId(userId: string): Promise<IPushSubscription[]> {
    return PushSubscription.find({ userId });
  },

  async findByUserIds(userIds: string[]): Promise<IPushSubscription[]> {
    return PushSubscription.find({ userId: { $in: userIds } });
  },

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await PushSubscription.deleteOne({ endpoint });
  },

  async deleteByUserAndEndpoint(userId: string, endpoint: string): Promise<void> {
    await PushSubscription.deleteOne({ userId, endpoint });
  },

  async deleteByUserId(userId: string, session?: ClientSession): Promise<number> {
    const result = await PushSubscription.deleteMany({ userId }, session ? { session } : {});
    return result.deletedCount;
  },

  async countByUserId(userId: string): Promise<number> {
    return PushSubscription.countDocuments({ userId });
  },

  /** מזהי כל המשתמשים עם מנוי push פעיל לפחות אחד - שאילתה יחידה, לשימוש בסימון גורף (למשל טבלת אדמין) במקום N+1. */
  async distinctUserIds(): Promise<string[]> {
    const ids = await PushSubscription.distinct('userId');
    return ids.map(String);
  },
};
