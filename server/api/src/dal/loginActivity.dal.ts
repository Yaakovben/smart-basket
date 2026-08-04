import mongoose from 'mongoose';
import { LoginActivity, type ILoginActivity, type LoginMethod } from '../models';
import { createBaseDal } from './base.dal';

export const LoginActivityDAL = {
  ...createBaseDal<ILoginActivity>(LoginActivity),

  async findPaginated(options: { page?: number; limit?: number } = {}): Promise<{
    activities: ILoginActivity[];
    total: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      LoginActivity.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean() as unknown as Promise<ILoginActivity[]>,
      LoginActivity.countDocuments(),
    ]);

    return { activities, total };
  },

  // סטטיסטיקות התחברות לכל משתמש (רק עבור userIds הנתונים - בלי הסינון הזה
  // ה-$group רץ על כל היסטוריית ההתחברויות אי-פעם, שגדלה בכל login/app-open
  // ולא רק בהרשמות; scan+group על אוסף שלם כזה זו עבודה מיותרת כשבפועל
  // צריך רק את המשתמשים שמוצגים כרגע ברשימת האדמין).
  // משתמש ב-$max במקום $sort+$push - חוסך מיון כבד וצריכת זיכרון
  async getStatsByUser(userIds: string[]): Promise<Array<{
    userId: string;
    totalLogins: number;
    lastLoginAt: Date | null;
    lastLoginMethod: string | null;
    lastAppOpenAt: Date | null;
  }>> {
    if (userIds.length === 0) return [];
    return LoginActivity.aggregate([
      { $match: { user: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) } } },
      {
        $group: {
          _id: '$user',
          totalLogins: { $sum: 1 },
          // התחברות אחרונה (email/google) ישירות עם $max
          lastLoginAt: {
            $max: {
              $cond: [{ $in: ['$loginMethod', ['email', 'google']] }, '$createdAt', null],
            },
          },
          // פתיחת אפליקציה אחרונה
          lastAppOpenAt: {
            $max: {
              $cond: [{ $eq: ['$loginMethod', 'app_open'] }, '$createdAt', null],
            },
          },
          // שיטת התחברות אחרונה: שימוש ב-$max על מחרוזת תאריך+שיטה
          _lastLoginEntry: {
            $max: {
              $cond: [
                { $in: ['$loginMethod', ['email', 'google']] },
                { $concat: [{ $dateToString: { format: '%Y%m%d%H%M%S', date: '$createdAt' } }, ':', '$loginMethod'] },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          userId: { $toString: '$_id' },
          totalLogins: 1,
          lastLoginAt: 1,
          lastAppOpenAt: 1,
          lastLoginMethod: {
            $cond: [
              { $eq: ['$_lastLoginEntry', null] },
              null,
              { $arrayElemAt: [{ $split: ['$_lastLoginEntry', ':'] }, 1] },
            ],
          },
        },
      },
    ]);
  },

  // ספירת כניסות מתאריך מסוים (כולל ייחודיים)
  async getStatsSince(since: Date): Promise<{
    totalLogins: number;
    uniqueUsers: number;
  }> {
    const result = await LoginActivity.aggregate([
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
  },

  async countSince(since: Date): Promise<number> {
    return LoginActivity.countDocuments({ createdAt: { $gte: since } });
  },

  async deleteByUser(userId: string): Promise<number> {
    const result = await LoginActivity.deleteMany({ user: userId });
    return result.deletedCount;
  },

  async logActivity(data: {
    userId: string;
    userName: string;
    userEmail: string;
    loginMethod: LoginMethod;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ILoginActivity> {
    return LoginActivity.create({
      user: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      loginMethod: data.loginMethod,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }) as Promise<ILoginActivity>;
  },
};
