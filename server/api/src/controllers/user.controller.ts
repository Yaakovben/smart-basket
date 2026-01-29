import type { Response } from 'express';
import { UserService } from '../services';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';
import type { UpdateProfileInput } from '../utils/validators';

export class UserController {
  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const user = await UserService.getProfile(userId);

    res.json({
      success: true,
      data: user,
    });
  });

  static updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const data = req.body as UpdateProfileInput;
    const user = await UserService.updateProfile(userId, data);

    res.json({
      success: true,
      data: user,
    });
  });

  static deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    await UserService.deleteAccount(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  });
}
