import type { Request, Response } from 'express';
import { AuthService, TokenService } from '../services';
import { asyncHandler } from '../utils';
import { AuthError } from '../errors';
import type { RegisterInput, LoginInput, CheckEmailInput, GoogleAuthInput } from '../validators';

export class AuthController {
  // בדיקת קיום מייל
  static checkEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as CheckEmailInput;
    const result = await AuthService.checkEmail(email);

    res.json({
      success: true,
      data: result,
    });
  });

  static register = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as RegisterInput;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await AuthService.register(data, ipAddress, userAgent);

    res.status(201).json({
      success: true,
      data: result,
    });
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as LoginInput;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await AuthService.login(data, ipAddress, userAgent);

    res.json({
      success: true,
      data: result,
    });
  });

  static googleAuth = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as GoogleAuthInput;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await AuthService.googleAuth(data, ipAddress, userAgent);

    res.json({
      success: true,
      data: result,
    });
  });

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await TokenService.refreshAccessToken(refreshToken);

    if (!result) {
      throw AuthError.invalidToken();
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
