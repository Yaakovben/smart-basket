import type { Request, Response } from 'express';
import { AuthService, TokenService } from '../services';
import { asyncHandler, ApiError } from '../utils';
import type { RegisterInput, LoginInput, GoogleAuthInput } from '../utils/validators';

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as RegisterInput;
    const result = await AuthService.register(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as LoginInput;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = await AuthService.login(data, ipAddress);

    res.json({
      success: true,
      data: result,
    });
  });

  static googleAuth = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as GoogleAuthInput;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = await AuthService.googleAuth(data, ipAddress);

    res.json({
      success: true,
      data: result,
    });
  });

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await TokenService.refreshAccessToken(refreshToken);

    if (!result) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    res.json({
      success: true,
      data: result,
    });
  });

  static logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    await TokenService.invalidateRefreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
}
