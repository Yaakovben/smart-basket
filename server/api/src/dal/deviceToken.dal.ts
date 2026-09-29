import { DeviceToken, type IDeviceToken, type DevicePlatform } from '../models';
import type { ClientSession } from 'mongoose';

// טוקני התראות של האפליקציות מהחנות (ראו DeviceToken.model)
export const DeviceTokenDAL = {
  /** רישום או עדכון: טוקן קיים עובר למשתמש הנוכחי (מכשיר שהחליף חשבון). */
  async upsert(userId: string, token: string, platform: DevicePlatform): Promise<void> {
    await DeviceToken.updateOne(
      { token },
      { $set: { userId, platform } },
      { upsert: true },
    );
  },

  async findByUserId(userId: string): Promise<IDeviceToken[]> {
    return DeviceToken.find({ userId });
  },

  async findByUserIds(userIds: string[]): Promise<IDeviceToken[]> {
    return DeviceToken.find({ userId: { $in: userIds } });
  },

  async findAll(): Promise<IDeviceToken[]> {
    return DeviceToken.find({});
  },

  async deleteByToken(token: string): Promise<void> {
    await DeviceToken.deleteOne({ token });
  },

  async deleteByUserAndToken(userId: string, token: string): Promise<void> {
    await DeviceToken.deleteOne({ userId, token });
  },

  async deleteByUserId(userId: string, session?: ClientSession): Promise<number> {
    const result = await DeviceToken.deleteMany({ userId }, session ? { session } : {});
    return result.deletedCount;
  },

  async existsForUserAndPlatform(userId: string, platform: DevicePlatform): Promise<boolean> {
    return !!(await DeviceToken.exists({ userId, platform }));
  },

  async countByUserId(userId: string): Promise<number> {
    return DeviceToken.countDocuments({ userId });
  },

  async distinctUserIds(): Promise<string[]> {
    const ids = await DeviceToken.distinct('userId');
    return ids.map(String);
  },
};
