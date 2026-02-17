import type { Response } from 'express';
import { UserDAL, ListDAL, ProductDAL, LoginActivityDAL } from '../dal';
import { UserService } from '../services/user.service';
import { ForbiddenError } from '../errors';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

export class AdminController {
  static getUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const users = await UserDAL.findAllSorted();

    res.json({
      success: true,
      data: users,
    });
  });

  static getLoginActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string, 10) || 50));

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
    const [
      totalUsers,
      totalLists,
      totalGroupLists,
      recentUsers,
      recentActivity,
    ] = await Promise.all([
      UserDAL.count({}),
      ListDAL.count({}),
      ListDAL.count({ isGroup: true }),
      UserDAL.count({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      LoginActivityDAL.countSince(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    ]);

    const totalProducts = await ProductDAL.count({});

    res.json({
      success: true,
      data: {
        totalUsers,
        totalLists,
        totalGroupLists,
        totalProducts,
        recentUsers,
        recentActivity,
      },
    });
  });

  static deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    // מניעת מחיקה עצמית
    if (userId === req.user!.id) {
      throw ForbiddenError.notOwner();
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
