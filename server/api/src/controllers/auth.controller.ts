import type { Request, Response } from 'express';
import { AuthService, TokenService } from '../services';
import { LoginActivityDAL } from '../dal';
import { asyncHandler } from '../utils';
import { AuthError } from '../errors';
import { logger } from '../config';
import type { AuthRequest } from '../types';
import type { RegisterInput, LoginInput, CheckEmailInput, GoogleAuthInput } from '../validators';

const getClientInfo = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress,
  userAgent: req.get('User-Agent'),
});

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
    const { ipAddress, userAgent } = getClientInfo(req);
    const result = await AuthService.register(data, ipAddress, userAgent);

    res.status(201).json({
      success: true,
      data: result,
    });
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as LoginInput;
    const { ipAddress, userAgent } = getClientInfo(req);
    const result = await AuthService.login(data, ipAddress, userAgent);

    res.json({
      success: true,
      data: result,
    });
  });

  static googleAuth = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as GoogleAuthInput;
    const { ipAddress, userAgent } = getClientInfo(req);
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

  // רישום פתיחת אפליקציה
  static logAppOpen = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const { ipAddress, userAgent } = getClientInfo(req);

    LoginActivityDAL.logActivity({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      loginMethod: 'app_open',
      ipAddress,
      userAgent,
    }).catch(err => logger.warn('Failed to log app open:', err));

    res.status(204).send();
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
