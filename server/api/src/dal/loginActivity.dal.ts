import { LoginActivity, type ILoginActivity, type LoginMethod } from '../models';
import { BaseDAL } from './base.dal';

class LoginActivityDALClass extends BaseDAL<ILoginActivity> {
  constructor() {
    super(LoginActivity);
  }

  async findPaginated(options: { page?: number; limit?: number } = {}): Promise<{
    activities: ILoginActivity[];
    total: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.model.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(),
    ]);

    return { activities, total };
  }

  // סטטיסטיקות התחברות לכל משתמש (aggregation ישירות ב-MongoDB)
  async getStatsByUser(): Promise<Array<{
    userId: string;
    totalLogins: number;
    lastLoginAt: Date;
    lastLoginMethod: string;
  }>> {
    return this.model.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$user',
          totalLogins: { $sum: 1 },
          lastLoginAt: { $first: '$createdAt' },
          lastLoginMethod: { $first: '$loginMethod' },
        },
      },
      {
        $project: {
          _id: 0,
          userId: { $toString: '$_id' },
          totalLogins: 1,
          lastLoginAt: 1,
          lastLoginMethod: 1,
        },
      },
    ]);
  }

  // ספירת כניסות מתאריך מסוים (כולל ייחודיים)
  async getStatsSince(since: Date): Promise<{
    totalLogins: number;
    uniqueUsers: number;
  }> {
    const result = await this.model.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          totalLogins: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
        },
      },
      {
        $project: {
          _id: 0,
          totalLogins: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
        },
      },
    ]);
    return result[0] || { totalLogins: 0, uniqueUsers: 0 };
  }

  async countSince(since: Date): Promise<number> {
    return this.model.countDocuments({ createdAt: { $gte: since } });
  }

  async deleteByUser(userId: string): Promise<number> {
    const result = await this.model.deleteMany({ user: userId });
    return result.deletedCount;
  }

  async logActivity(data: {
    userId: string;
    userName: string;
    userEmail: string;
    loginMethod: LoginMethod;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ILoginActivity> {
    return this.model.create({
      user: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      loginMethod: data.loginMethod,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }) as Promise<ILoginActivity>;
  }
}

export const LoginActivityDAL = new LoginActivityDALClass();
