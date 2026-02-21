import type { Response } from 'express';
import { UserDAL, ListDAL, ProductDAL, LoginActivityDAL } from '../dal';
import { UserService } from '../services/user.service';
import { ForbiddenError } from '../errors';
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

    // מיזוג נתונים
    const usersWithStats = users.map(user => {
      const userObj = typeof user.toJSON === 'function' ? user.toJSON() : user;
      const stats = statsMap.get(String(userObj._id || userObj.id));
      return {
        ...userObj,
        totalLogins: stats?.totalLogins || 0,
        lastLoginAt: stats?.lastLoginAt || null,
        lastLoginMethod: stats?.lastLoginMethod || null,
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

    const [
      totalUsers,
      totalLists,
      totalGroupLists,
      totalProducts,
      todayStats,
      monthStats,
    ] = await Promise.all([
      UserDAL.count({}),
      ListDAL.count({}),
      ListDAL.count({ isGroup: true }),
      ProductDAL.count({}),
      LoginActivityDAL.getStatsSince(todayStart),
      LoginActivityDAL.getStatsSince(monthStart),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalLists,
        totalGroupLists,
        totalProducts,
        loginsToday: todayStats.totalLogins,
        uniqueUsersToday: todayStats.uniqueUsers,
        loginsThisMonth: monthStats.totalLogins,
        uniqueUsersThisMonth: monthStats.uniqueUsers,
      },
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
