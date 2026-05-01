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
import { UserDAL, ListDAL, ProductDAL, LoginActivityDAL } from '../dal';
import { deleteAccount } from '../services/user.service';

/**
 * GET /api/admin/users
 * רשימת כל המשתמשים עם סטטיסטיקות התחברות (totalLogins, lastLogin, וכו׳).
 */
export const getUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [users, loginStats] = await Promise.all([
    UserDAL.findAllSorted(),
    LoginActivityDAL.getStatsByUser(),
  ]);

  const statsMap = new Map(loginStats.map(s => [s.userId, s]));

  // מיזוג סטטיסטיקות + הסרת שדות פנימיים (_id, __v, password)
  const usersWithStats = users.map(user => {
    const userObj = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const userId = String(userObj._id || userObj.id);
    const stats = statsMap.get(userId);
    const { _id, __v, password, ...rest } = userObj as Record<string, unknown>;
    return {
      ...rest,
      id: userId,
      totalLogins: stats?.totalLogins || 0,
      lastLoginAt: stats?.lastLoginAt || null,
      lastLoginMethod: stats?.lastLoginMethod || null,
      lastAppOpenAt: stats?.lastAppOpenAt || null,
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
