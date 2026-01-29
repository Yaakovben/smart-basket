import type { Response } from 'express';
import { User, List, LoginActivity } from '../models';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

export class AdminController {
  static getUsers = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users,
    });
  });

  static getLoginActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      LoginActivity.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LoginActivity.countDocuments(),
    ]);

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
      User.countDocuments(),
      List.countDocuments(),
      List.countDocuments({ isGroup: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      LoginActivity.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Get products count
    const listsWithProducts = await List.aggregate([
      { $unwind: '$products' },
      { $count: 'totalProducts' },
    ]);
    const totalProducts = listsWithProducts[0]?.totalProducts || 0;

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

    // Delete user's owned lists
    await List.deleteMany({ owner: userId });

    // Remove user from group lists
    await List.updateMany(
      { 'members.user': userId },
      { $pull: { members: { user: userId } } }
    );

    // Delete user
    await User.findByIdAndDelete(userId);

    // Delete login activities
    await LoginActivity.deleteMany({ user: userId });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  });
}
