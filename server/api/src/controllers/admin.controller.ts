/**
 * admin.controller.ts
 *
 * פעולות ניהול הזמינות רק לאדמין:
 * - רשימת משתמשים + סטטיסטיקות התחברות
 * - היסטוריית כניסות (עם pagination)
 * - Dashboard stats (היום, החודש)
 * - פירוט משתמש (רשימות שלו + ספירת מוצרים)
 * - מחיקת משתמש
 *
 * כל הנתיבים כאן דורשים authenticate + isAdmin.
 * מותקן ב-/api/admin.
 */

import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthRequest } from '../types';
import { asyncHandler } from '../utils';
import { ForbiddenError, NotFoundError } from '../errors';
import { UserDAL, ListDAL, ProductDAL, LoginActivityDAL, PushSubscriptionDAL } from '../dal';
import { deleteAccount } from '../services/user.service';
import { getAiStatus, refreshAiStatus } from '../services/aiAssistant.service';
import { getCloudinaryUsage, scanCloudinaryOrphans, deleteCloudinaryOrphans, getLocalImagesStats, clearLocalImages } from '../services/imageUpload.service';

/**
 * GET /api/admin/users
 * רשימת כל המשתמשים עם סטטיסטיקות התחברות (totalLogins, lastLogin, וכו׳).
 */
export const getUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const users = await UserDAL.findAllSorted();
  const userIds = users.map(u => String(u._id));
  // שאילתה יחידה בשביל כל המשתמשים (לא N+1) - מזהה מי יש לו מנוי push פעיל,
  // כדי שפאנל השליחה יוכל להראות את זה מיד עם בחירת משתמש, לפני שליחה בפועל.
  const [loginStats, pushSubscribedIds] = await Promise.all([
    LoginActivityDAL.getStatsByUser(userIds),
    PushSubscriptionDAL.distinctUserIds(),
  ]);

  const statsMap = new Map(loginStats.map(s => [s.userId, s]));
  const pushSubscribedSet = new Set(pushSubscribedIds.map(String));

  // מיזוג סטטיסטיקות + הסרת שדות פנימיים (_id, __v, password)
  const usersWithStats = users.map(user => {
    const userObj = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const userId = String(userObj._id || userObj.id);
    const stats = statsMap.get(userId);
    const { _id, __v, password, ...rest } = userObj as Record<string, unknown>;

    // totalLogins המוצג לא יכול פשוט להיות ה-live count מ-LoginActivity:
    // לרשומות שם יש TTL של 90 יום (ראו LoginActivity.model.ts) - ברגע
    // שרשומת כניסה ישנה של משתמש מתפוגגת, ה-live count שלו יורד גם בלי
    // שהוא "איבד" כניסה בפועל (זה מה שגרם ל"אתמול 70, היום 69"). לכן
    // שומרים ב-DB "שיא" קבוע (totalLogins על ה-User עצמו) שרק עולה - אף
    // פעם לא יורד, גם כשה-live count מתחתיו בגלל תפוגה.
    const liveCount = stats?.totalLogins || 0;
    const persistedFloor = (rest.totalLogins as number) || 0;
    const totalLogins = Math.max(persistedFloor, liveCount);
    if (totalLogins > persistedFloor) {
      void UserDAL.updateById(userId, { totalLogins } as Partial<typeof user>).catch(() => {});
    }

    return {
      ...rest,
      id: userId,
      totalLogins,
      lastLoginAt: stats?.lastLoginAt || null,
      lastLoginMethod: stats?.lastLoginMethod || null,
      lastAppOpenAt: stats?.lastAppOpenAt || null,
      hasPushSubscription: pushSubscribedSet.has(userId),
    };
  });

  res.json({ success: true, data: usersWithStats });
});

/**
 * GET /api/admin/login-activity
 * היסטוריית כניסות עם pagination. query: ?page=1&limit=50
 */
export const getLoginActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string, 10) || 50));

  const { activities, total } = await LoginActivityDAL.findPaginated({ page, limit });

  res.json({
    success: true,
    data: {
      activities,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * GET /api/admin/stats
 * נתוני Dashboard: סה״כ משתמשים + כניסות היום + כניסות החודש.
 */
export const getStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // שאילתות קלות בלבד במקביל, ללא ספירות כבדות שלא מוצגות
  const [totalUsers, todayStats, monthStats] = await Promise.all([
    UserDAL.count({}),
    LoginActivityDAL.getStatsSince(todayStart),
    LoginActivityDAL.getStatsSince(monthStart),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      loginsToday: todayStats.totalLogins,
      uniqueUsersToday: todayStats.uniqueUsers,
      loginsThisMonth: monthStats.totalLogins,
      uniqueUsersThisMonth: monthStats.uniqueUsers,
    },
  });
});

/**
 * GET /api/admin/users/:userId
 * פרטי משתמש מורחבים: רשימות שהוא בעלים או חבר בהן + ספירת מוצרים לכל רשימה.
 */
export const getUserDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const user = await UserDAL.findById(userId);
  if (!user) throw NotFoundError.user();

  const uid = new mongoose.Types.ObjectId(userId);

  // רשימות שהמשתמש בעלים או חבר בהן
  const lists = await ListDAL.find({
    $or: [{ owner: uid }, { 'members.user': uid }],
  });

  // ספירת מוצרים לכל רשימה (שאילתה אחת מקובצת)
  const countsMap = await ProductDAL.countGroupedByListIds(lists.map(l => l._id));

  const listsData = lists.map(list => ({
    id: list._id.toString(),
    name: list.name,
    isGroup: list.isGroup,
    isOwner: list.owner.toString() === userId,
    membersCount: (list.members?.length || 0) + 1,
    productCount: countsMap.get(list._id.toString())?.total || 0,
    purchasedCount: countsMap.get(list._id.toString())?.purchased || 0,
  }));

  res.json({ success: true, data: { lists: listsData } });
});

/**
 * DELETE /api/admin/users/:userId
 * מחיקת משתמש מלאה (כולל רשימות, התראות, push subscriptions).
 * אין אפשרות למחוק את עצמו (ForbiddenError).
 */
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  // מניעת מחיקה עצמית
  if (userId === req.user!.id) throw ForbiddenError.cannotDeleteSelf();

  await deleteAccount(userId);
  // מחיקת לוגי התחברות (לא כלול ב-deleteAccount כי הם לא שייכים לטרנזקציה)
  await LoginActivityDAL.deleteByUser(userId);

  res.json({ success: true, message: 'User deleted successfully' });
});

/**
 * GET /api/admin/db-health
 * מחזיר נתוני שימוש ב-MongoDB: גודל כולל, פר-קולקציה, אחוז שימוש מול הסף
 * (ברירת מחדל 512MB של Atlas M0). שימושי לאדמין שצריך לדעת מתי להעביר plan.
 */
export const getDbHealth = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const conn = mongoose.connection;
  if (!conn.db) {
    res.status(503).json({ success: false, message: 'DB not connected' });
    return;
  }

  // ENV variable מאפשר להגדיר סף שונה (M2=2GB, M5=5GB)
  const limitMB = Number(process.env.MONGO_LIMIT_MB) || 512;
  const limitBytes = limitMB * 1024 * 1024;

  const stats = await conn.db.stats();
  const dataSize = stats.dataSize as number;
  const storageSize = stats.storageSize as number;
  const indexSize = stats.indexSize as number;
  const totalSize = (storageSize + indexSize);

  // פירוט פר-קולקציה
  const collections = await conn.db.listCollections().toArray();
  const perCollection: Array<{ name: string; documents: number; size: number; storageSize: number; indexSize: number }> = [];
  for (const c of collections) {
    try {
      const collStats = await conn.db.command({ collStats: c.name });
      perCollection.push({
        name: c.name,
        documents: collStats.count || 0,
        size: collStats.size || 0,
        storageSize: collStats.storageSize || 0,
        indexSize: collStats.totalIndexSize || 0,
      });
    } catch {
      // קולקציה ייתכן ולא קיימת או שלא ניתן להריץ collStats
    }
  }
  perCollection.sort((a, b) => (b.storageSize + b.indexSize) - (a.storageSize + a.indexSize));

  const usedPct = (totalSize / limitBytes) * 100;
  const status: 'ok' | 'warning' | 'critical' =
    usedPct < 70 ? 'ok' : usedPct < 90 ? 'warning' : 'critical';

  res.json({
    success: true,
    data: {
      limitMB,
      dataSize, storageSize, indexSize, totalSize,
      usedPct: Math.round(usedPct * 10) / 10,
      status,
      collectionCount: collections.length,
      collections: perCollection,
    },
  });
});

/**
 * GET /api/admin/cloudinary-health
 * חיווי שימוש ב-Cloudinary (credits/אחסון/תעבורה/טרנספורמציות) לפאנל האדמין.
 * מחזיר { configured: false } אם משתני הסביבה של Cloudinary לא מוגדרים.
 */
export const getCloudinaryHealth = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await getCloudinaryUsage();
  res.json({ success: true, data });
});

/**
 * GET/POST /api/admin/cloudinary-orphans
 * ניקוי חד-פעמי של תמונות שכבר יתומות ב-Cloudinary (מהצטברות שלפני
 * שההגנה השוטפת נוספה - ראו deleteCloudinaryImage/Images). dry-run
 * כברירת מחדל - מחזיר רק תצוגה מקדימה (ספירה + רשימת public_id-ים),
 * לא מוחק כלום. מוחק בפועל רק כשמגיע confirm=true (query או body).
 */
export const getCloudinaryOrphans = asyncHandler(async (req: AuthRequest, res: Response) => {
  const scan = await scanCloudinaryOrphans();
  const confirm = req.query.confirm === 'true' || (req.body as { confirm?: boolean } | undefined)?.confirm === true;

  if (!confirm) {
    res.json({
      success: true,
      data: {
        dryRun: true,
        totalCloudinaryResources: scan.totalCloudinaryResources,
        referencedCount: scan.referencedCount,
        orphanCount: scan.orphanPublicIds.length,
        orphanPublicIds: scan.orphanPublicIds,
      },
    });
    return;
  }

  const { deleted, failed } = await deleteCloudinaryOrphans(scan.orphanPublicIds);
  res.json({
    success: true,
    data: { dryRun: false, orphanCount: scan.orphanPublicIds.length, deleted, failed },
  });
});

/**
 * GET/POST /api/admin/local-images
 * תמונות מוצר ששמורות כ-data URL ישירות בתוך מסמכי המוצר (לא ב-Cloudinary,
 * ראו getLocalImagesStats) - תופסות מקום ב-DB עצמו. dry-run כברירת מחדל
 * (רק ספירה + גודל כולל). מסיר בפועל (רק את שדה image, לא את המוצר) רק
 * כשמגיע confirm=true (query או body).
 */
export const getLocalImages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await getLocalImagesStats();
  const confirm = req.query.confirm === 'true' || (req.body as { confirm?: boolean } | undefined)?.confirm === true;

  if (!confirm) {
    res.json({ success: true, data: { dryRun: true, count: stats.count, totalBytes: stats.totalBytes } });
    return;
  }

  const cleared = await clearLocalImages();
  res.json({ success: true, data: { dryRun: false, count: stats.count, totalBytes: stats.totalBytes, cleared } });
});

/**
 * GET /api/admin/ai-status
 * מצב עוזר ה-AI: איזה ספק/מודל פעיל כרגע, מתי עודכן, כמה בקשות בוצעו,
 * מכסת ה-rate-limit שהספק עצמו מחזיר (מתי מתאפסת, כמה נשאר), ומי הגיבוי.
 */
export const getAiStatusHandler = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await getAiStatus();
  res.json({ success: true, data });
});

/**
 * POST /api/admin/ai-status/refresh
 * מאלץ בדיקה מחדש של המודל הכי טוב הזמין ב-Groq עכשיו, בלי לחכות ל-cache השעתי.
 */
export const refreshAiStatusHandler = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = await refreshAiStatus();
  res.json({ success: true, data });
});
