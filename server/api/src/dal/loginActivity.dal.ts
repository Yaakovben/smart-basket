import mongoose from 'mongoose';
import { LoginActivity, type ILoginActivity, type LoginMethod } from '../models';
import { createBaseDal } from './base.dal';

type UserLoginStats = {
  userId: string;
  totalLogins: number;
  lastLoginAt: Date | null;
  lastLoginMethod: string | null;
  lastAppOpenAt: Date | null;
};

const LOGIN_STATS_CACHE_TTL_MS = 60 * 1000;
const loginStatsCache = new Map<string, { data: UserLoginStats[]; expiresAt: number }>();

async function computeStatsByUser(userIds: string[]): Promise<UserLoginStats[]> {
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
}

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
  //
  // גם עם הסינון, זה $group על כל היסטוריית ההתחברויות של כל המשתמשים
  // (הקורא היחיד היום, admin.controller.getUsers, תמיד מעביר את כל
  // המשתמשים) - זה מה שגורם לדף האדמין להיפתח לאט, ומחמיר ככל שהיסטוריית
  // ההתחברויות גדלה. cache קצר בזיכרון, פר-userIds (לא סתם slot גלובלי
  // כמו activeChainsCache ב-price.dal.ts, כדי שקריאה עתידית עם תת-קבוצה
  // שונה של משתמשים לא תקבל בטעות תוצאה של קבוצה אחרת), הופך פתיחות חוזרות
  // של דף האדמין (רענון, ניווט חזרה) לכמעט מיידיות בלי לפגוע משמעותית
  // בטריות - נתוני "כניסה אחרונה" לא צריכים דיוק לשנייה.
  async getStatsByUser(userIds: string[]): Promise<Array<{
    userId: string;
    totalLogins: number;
    lastLoginAt: Date | null;
    lastLoginMethod: string | null;
    lastAppOpenAt: Date | null;
  }>> {
    if (userIds.length === 0) return [];

    const cacheKey = [...userIds].sort().join(',');
    const cached = loginStatsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const data = await computeStatsByUser(userIds);
    loginStatsCache.clear(); // slot יחיד בפועל (קורא יחיד) - מונע דליפת זיכרון מ-cacheKey-ים ישנים
    loginStatsCache.set(cacheKey, { data, expiresAt: Date.now() + LOGIN_STATS_CACHE_TTL_MS });
    return data;
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
