import mongoose from 'mongoose';
import { LoginActivity, type ILoginActivity, type LoginMethod, type LoginPlatform } from '../models';
import { createBaseDal } from './base.dal';

type UserLoginStats = {
  userId: string;
  totalLogins: number;
  lastLoginAt: Date | null;
  lastLoginMethod: string | null;
  lastAppOpenAt: Date | null;
  // מאיפה נפתחה האפליקציה בפעם האחרונה (null ברשומות ישנות)
  lastAppOpenPlatform: LoginPlatform | null;
};

const LOGIN_STATS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 דקות — הספירות הכבדות לא צריכות דיוק לשנייה
// computedAt: מתי התחיל החישוב, כדי לדעת אילו כניסות עוד לא נספרו בו
const loginStatsCache = new Map<string, { data: UserLoginStats[]; computedAt: number; expiresAt: number; refreshing?: boolean }>();

// הכניסה ופתיחת האפליקציה האחרונות של כל משתמש, מתעדכנות מיד בכל רישום.
// הן מונחות מעל ה-cache של 30 הדקות, כך שבדף האדמין "פתח לאחרונה" מתעדכן
// מיד (גם בחזרה מהרקע), בלי להריץ את האגרגציה הכבדה בכל פתיחה.
// events: זמני הכניסות שנרשמו מאז החישוב האחרון, כדי שגם מספר הכניסות יהיה
// מדויק מיד ולא רק זמן הכניסה האחרונה.
const latestByUser = new Map<string, { appOpenAt?: Date; appOpenPlatform?: LoginPlatform; loginAt?: Date; loginMethod?: string; events: number[] }>();

const newer = (a: Date | null | undefined, b: Date | null | undefined): Date | null => {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

function withLatest(stats: UserLoginStats[], userIds: string[], computedAt: number): UserLoginStats[] {
  if (latestByUser.size === 0) return stats;
  const byId = new Map(stats.map(s => [s.userId, s]));
  // גם משתמש שהכניסה הראשונה שלו הגיעה אחרי החישוב: בלי זה הוא נראה "לא התחבר אף פעם"
  for (const id of userIds) {
    if (!byId.has(id) && latestByUser.has(id)) {
      byId.set(id, { userId: id, totalLogins: 0, lastLoginAt: null, lastLoginMethod: null, lastAppOpenAt: null, lastAppOpenPlatform: null });
    }
  }
  return [...byId.values()].map(s => {
    const latest = latestByUser.get(s.userId);
    if (!latest) return s;
    const lastLoginAt = newer(s.lastLoginAt, latest.loginAt);
    const lastAppOpenAt = newer(s.lastAppOpenAt, latest.appOpenAt);
    return {
      ...s,
      totalLogins: s.totalLogins + latest.events.filter(t => t >= computedAt).length,
      lastAppOpenAt,
      lastAppOpenPlatform: latest.appOpenAt && lastAppOpenAt === latest.appOpenAt
        ? latest.appOpenPlatform ?? null
        : s.lastAppOpenPlatform,
      lastLoginAt,
      lastLoginMethod: latest.loginAt && lastLoginAt === latest.loginAt ? latest.loginMethod ?? s.lastLoginMethod : s.lastLoginMethod,
    };
  });
}

// כניסות שכבר נכללו בחישוב שהסתיים לא צריכות להישמר בזיכרון
function pruneEvents(computedAt: number): void {
  for (const latest of latestByUser.values()) {
    latest.events = latest.events.filter(t => t >= computedAt);
  }
}

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
            $cond: [{ $in: ['$loginMethod', ['email', 'google', 'apple']] }, '$createdAt', null],
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
              { $in: ['$loginMethod', ['email', 'google', 'apple']] },
              { $concat: [{ $dateToString: { format: '%Y%m%d%H%M%S', date: '$createdAt' } }, ':', '$loginMethod'] },
              null,
            ],
          },
        },
        // מאיפה הייתה הפתיחה האחרונה: אותו טריק של תאריך+ערך
        _lastOpenEntry: {
          $max: {
            $cond: [
              { $eq: ['$loginMethod', 'app_open'] },
              { $concat: [{ $dateToString: { format: '%Y%m%d%H%M%S', date: '$createdAt' } }, ':', { $ifNull: ['$platform', ''] }] },
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
        lastAppOpenPlatform: {
          $let: {
            vars: { p: { $arrayElemAt: [{ $split: [{ $ifNull: ['$_lastOpenEntry', ''] }, ':'] }, 1] } },
            in: { $cond: [{ $in: ['$$p', [null, '']] }, null, '$$p'] },
          },
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
  // ההתחברויות גדלה.
  //
  // stale-while-revalidate: כשיש נתונים ב-cache (גם אם פגו) מחזירים אותם
  // *מיד* ומריצים את ה-aggregation ברקע לרענון. כך אף פתיחה של דף האדמין
  // לא מחכה ל-$group - רק הקריאה הראשונה אי-פעם (או אחרי restart של השרת)
  // חוסמת. נתוני "כניסה אחרונה" ממילא לא צריכים דיוק לשנייה.
  // cache פר-userIds (לא slot גלובלי) כדי שקריאה עם תת-קבוצה שונה של
  // משתמשים לא תקבל תוצאה של קבוצה אחרת.
  async getStatsByUser(userIds: string[]): Promise<UserLoginStats[]> {
    if (userIds.length === 0) return [];

    const cacheKey = [...userIds].sort().join(',');
    const now = Date.now();
    const cached = loginStatsCache.get(cacheKey);

    // cache טרי - מחזירים מיד
    if (cached && cached.expiresAt > now) return withLatest(cached.data, userIds, cached.computedAt);

    // cache פג אבל קיים - מחזירים ישן מיד, מרעננים ברקע (בלי לחסום)
    if (cached) {
      if (!cached.refreshing) {
        cached.refreshing = true;
        const startedAt = Date.now();
        void computeStatsByUser(userIds)
          .then(fresh => {
            loginStatsCache.clear(); // slot יחיד בפועל - מונע הצטברות מפתחות ישנים
            loginStatsCache.set(cacheKey, { data: fresh, computedAt: startedAt, expiresAt: Date.now() + LOGIN_STATS_CACHE_TTL_MS });
            pruneEvents(startedAt);
          })
          .catch(() => { cached.refreshing = false; /* משאירים את הישן, ננסה שוב בקריאה הבאה */ });
      }
      return withLatest(cached.data, userIds, cached.computedAt);
    }

    // אין כלום ב-cache - חייבים לחשב (חוסם, קורה רק בקריאה הראשונה)
    const startedAt = Date.now();
    const data = await computeStatsByUser(userIds);
    loginStatsCache.clear(); // slot יחיד בפועל (קורא יחיד) - מונע דליפת זיכרון מ-cacheKey-ים ישנים
    loginStatsCache.set(cacheKey, { data, computedAt: startedAt, expiresAt: Date.now() + LOGIN_STATS_CACHE_TTL_MS });
    pruneEvents(startedAt);
    return withLatest(data, userIds, startedAt);
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
    latestByUser.delete(userId);
    const result = await LoginActivity.deleteMany({ user: userId });
    return result.deletedCount;
  },

  async logActivity(data: {
    userId: string;
    userName: string;
    userEmail: string;
    loginMethod: LoginMethod;
    platform?: LoginPlatform;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ILoginActivity> {
    const now = new Date();
    const latest = latestByUser.get(data.userId) ?? { events: [] };
    if (data.loginMethod === 'app_open') { latest.appOpenAt = now; latest.appOpenPlatform = data.platform; }
    else { latest.loginAt = now; latest.loginMethod = data.loginMethod; }
    latestByUser.set(data.userId, latest);
    const doc = await (LoginActivity.create({
      user: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      loginMethod: data.loginMethod,
      ...(data.platform ? { platform: data.platform } : {}),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    }) as Promise<ILoginActivity>);
    // נספר רק אחרי שנשמר בפועל; זמן השמירה עצמו, כדי שיתאים לחישוב הבא
    latest.events.push(new Date(doc.createdAt ?? now).getTime());
    return doc;
  },
};
