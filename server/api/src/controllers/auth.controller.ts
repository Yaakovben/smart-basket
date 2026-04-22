/**
 * auth.controller.ts
 *
 * Controller של אימות - כניסה, הרשמה, Google OAuth, refresh token, logout.
 * מותקן ב-/api/auth ב-routes/index.ts.
 *
 * רוב הנתיבים כאן פתוחים (לא דורשים אימות) - רק logAppOpen דורש משתמש מחובר.
 */

import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import type { RegisterInput, LoginInput, CheckEmailInput, GoogleAuthInput } from '../validators';
import { asyncHandler } from '../utils';
import { AuthError } from '../errors';
import { logger } from '../config';
import { LoginActivityDAL } from '../dal';
import * as authService from '../services/auth.service';
import { refreshAccessToken, invalidateRefreshToken } from '../services/token.service';

// ====================== עזר ======================

const getClientInfo = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress,
  userAgent: req.get('User-Agent'),
});

// ====================== Handlers ======================

/**
 * POST /api/auth/check-email
 * בודק אם מייל קיים במערכת ואם הוא חשבון Google בלבד.
 * משמש את מסך הכניסה בצד הלקוח לניתוב בין login/register/google-only.
 */
export const checkEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as CheckEmailInput;
  const result = await authService.checkEmail(email);
  res.json({ success: true, data: result });
});

/**
 * POST /api/auth/register
 * יצירת חשבון חדש עם מייל + סיסמה. מחזיר את המשתמש + זוג טוקנים.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as RegisterInput;
  const { ipAddress, userAgent } = getClientInfo(req);
  const result = await authService.register(data, ipAddress, userAgent);
  res.status(201).json({ success: true, data: result });
});

/**
 * POST /api/auth/login
 * כניסה עם מייל + סיסמה. מחזיר את המשתמש + זוג טוקנים.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as LoginInput;
  const { ipAddress, userAgent } = getClientInfo(req);
  const result = await authService.login(data, ipAddress, userAgent);
  res.json({ success: true, data: result });
});

/**
 * POST /api/auth/google
 * כניסה/הרשמה עם Google OAuth access-token.
 */
export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const data = req.body as GoogleAuthInput;
  const { ipAddress, userAgent } = getClientInfo(req);
  const result = await authService.googleAuth(data, ipAddress, userAgent);
  res.json({ success: true, data: result });
});

/**
 * POST /api/auth/refresh
 * רענון access token באמצעות refresh token. אם פג - זורק InvalidToken.
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: refreshTokenValue } = req.body as { refreshToken: string };
  const result = await refreshAccessToken(refreshTokenValue);
  if (!result) throw AuthError.invalidToken();
  res.json({ success: true, data: result });
});

/**
 * POST /api/auth/log-app-open
 * רישום פתיחת אפליקציה (metric). דורש משתמש מחובר.
 * הכתיבה ל-DB רצה ברקע - התגובה מיידית (204).
 */
export const logAppOpen = asyncHandler(async (req: AuthRequest, res: Response) => {
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

/**
 * POST /api/auth/logout
 * יציאה - ביטול ה-refresh token הנוכחי (לא משפיע על מכשירים אחרים).
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: refreshTokenValue } = req.body as { refreshToken: string };
  await invalidateRefreshToken(refreshTokenValue);
  res.json({ success: true, message: 'Logged out successfully' });
});
