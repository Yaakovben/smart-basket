import type { Response } from 'express';
import mongoose from 'mongoose';
import { UserDAL, ListDAL, ProductDAL, LoginActivityDAL } from '../dal';
import { UserService } from '../services/user.service';
import { ForbiddenError, NotFoundError } from '../errors';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

export class AdminController {
  static getUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
    // שליפת משתמשים וסטטיסטיקות התחברות במקביל
    const [users, loginStats] = await Promise.all([
      UserDAL.findAllSorted(),
      LoginActivityDAL.getStatsByUser(),
    ]);

    // מיפוי סטטיסטיקות לפי מזהה משתמש
    const statsMap = new Map(loginStats.map(s => [s.userId, s]));

    // מיזוג נתונים (lean objects מגיעים עם _id, צריך להמיר ל-id)
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

    res.json({
      success: true,
      data: usersWithStats,
    });
  });

  static getLoginActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string, 10) || 50));

    const { activities, total } = await LoginActivityDAL.findPaginated({ page, limit });

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  });

  static getStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // שאילתות קלות בלבד, ללא ספירות כבדות שלא מוצגות
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

  // פרטי משתמש מורחבים: רשימות + מספר מוצרים בכל רשימה
  static getUserDetails = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    const user = await UserDAL.findById(userId);
    if (!user) throw NotFoundError.user();

    const uid = new mongoose.Types.ObjectId(userId);

    // רשימות שהמשתמש בעלים או חבר בהן
    const lists = await ListDAL.find({
      $or: [{ owner: uid }, { 'members.user': uid }],
    });

    // ספירת מוצרים לכל רשימה
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

    res.json({
      success: true,
      data: { lists: listsData },
    });
  });

  static deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    // מניעת מחיקה עצמית
    if (userId === req.user!.id) {
      throw ForbiddenError.cannotDeleteSelf();
    }

    await UserService.deleteAccount(userId);

    // מחיקת לוגי התחברות (לא כלול ב-deleteAccount)
    await LoginActivityDAL.deleteByUser(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  });
}
