/**
 * auth.controller.ts
 *
 * Controller של אימות - כניסה, הרשמה, Google OAuth, refresh token, logout.
 * מותקן ב-/api/auth ב-routes/index.ts.
 *
 * רוב הנתיבים כאן פתוחים (לא דורשים אימות) - רק logAppOpen דורש משתמש מחובר.
 */

import crypto from 'crypto';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import type { RegisterInput, LoginInput, CheckEmailInput, GoogleAuthInput, AppleAuthInput } from '../validators';
import { asyncHandler } from '../utils';
import { AuthError, ConflictError } from '../errors';
import { logger } from '../config';
import { env } from '../config';
import { LoginActivityDAL } from '../dal';
import { parseLoginPlatform } from '../models';
import * as authService from '../services/auth.service';
import { refreshAccessToken, invalidateRefreshToken } from '../services/token.service';

// ====================== עזר ======================

const getClientInfo = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress,
  userAgent: req.get('User-Agent'),
  // דפדפן / מסך הבית / אפליקציה מהחנות, כפי שהלקוח מזהה את עצמו
  platform: parseLoginPlatform(req.get('X-App-Platform')),
});

// שם ה-cookie של ה-refresh token. path מוגבל ל-/api/auth כדי שלא ייסגר
// לכל בקשת API — רק לנתיבי האימות שצריכים אותו.
const REFRESH_COOKIE = 'sb_refresh';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  // strict/lax לא נשלחים בבקשת fetch/XHR cross-site (כמו קליינט ב-Vercel
  // מול API ב-Render) - גם עם ה-/api proxy הכי טוב שיוגדר, אם מישהו
  // ישאיר את VITE_API_URL מצביע ישירות ל-Render (בטעות, או כי redeploy לא
  // כלל את שינוי ה-proxy), ה-cookie פשוט לא יישלח בכלל וההתחברות תתנתק
  // אחרי 24 שעות בלי תלות בכלום אחר. none מאפשר שליחה cross-site תמיד -
  // מוגן ע"י httpOnly (JS לא יכול לקרוא אותו) + רשימת CORS_ORIGIN שמאשרת
  // רק את הדומיינים שלנו (בקשת cross-site מאתר לא-מורשה נחסמת ב-preflight
  // לפני שהיא בכלל נשלחת). זה דפוס תקני לארכיטקטורת client/api בדומיינים
  // נפרדים, לא חשיפת הטוקן עצמו כמו החלופה שנדחתה (שמירתו ב-localStorage).
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/api/auth',
  maxAge: 40 * 24 * 60 * 60 * 1000, // 40 יום חוסר פעילות (מתחדש בכל רענון)
};

const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE, token, REFRESH_COOKIE_OPTS);

const clearRefreshCookie = (res: Response) =>
  res.clearCookie(REFRESH_COOKIE, { ...REFRESH_COOKIE_OPTS, maxAge: 0 });

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
  const registerInput = req.body as RegisterInput;
  const { ipAddress, userAgent, platform } = getClientInfo(req);
  const result = await authService.register(registerInput, ipAddress, userAgent, platform);
  setRefreshCookie(res, result.tokens.refreshToken);
  res.status(201).json({ success: true, data: result });
});

/**
 * POST /api/auth/login
 * כניסה עם מייל + סיסמה. מחזיר את המשתמש + זוג טוקנים.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const loginInput = req.body as LoginInput;
  const { ipAddress, userAgent, platform } = getClientInfo(req);
  const result = await authService.login(loginInput, ipAddress, userAgent, platform);
  setRefreshCookie(res, result.tokens.refreshToken);
  res.json({ success: true, data: result });
});

/**
 * POST /api/auth/google
 * כניסה/הרשמה עם Google OAuth access-token.
 */
export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const googleAuthInput = req.body as GoogleAuthInput;
  const { ipAddress, userAgent, platform } = getClientInfo(req);
  const result = await authService.googleAuth(googleAuthInput, ipAddress, userAgent, platform);
  setRefreshCookie(res, result.tokens.refreshToken);
  res.json({ success: true, data: result });
});

/**
 * POST /api/auth/apple
 * כניסה/הרשמה עם Sign in with Apple (אפליקציית iOS).
 */
export const appleAuth = asyncHandler(async (req: Request, res: Response) => {
  const appleAuthInput = req.body as AppleAuthInput;
  const { ipAddress, userAgent, platform } = getClientInfo(req);
  const result = await authService.appleAuth(appleAuthInput, ipAddress, userAgent, platform);
  setRefreshCookie(res, result.tokens.refreshToken);
  res.json({ success: true, data: result });
});

/**
 * POST /api/auth/apple/callback
 * חזרה מדף ההתחברות של אפל (באתר ובאפליקציית אנדרואיד). אפל שולחת טופס
 * (form_post) עם id_token ו-state. ה-state נבדק מול cookie שהאתר קבע רגע לפני
 * המעבר לאפל, כדי שאתר זר לא יוכל להכניס משתמש לחשבון של מישהו אחר.
 * בהצלחה נקבע ה-refresh cookie והדפדפן חוזר למסך הכניסה, שמשלים את ההתחברות.
 * אחרי ה-state מגיעה גם הפלטפורמה ("<אקראי>.<פלטפורמה>"), כי לבקשה מאפל
 * אין את הכותרת X-App-Platform.
 */
export const APPLE_STATE_COOKIE = 'sb_apple_state';
const APPLE_STATE_COOKIE_PATH = '/api/auth/apple';

export const appleCallback = async (req: Request, res: Response): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const state = str(body.state);
  const cookieState = str((req.cookies as Record<string, unknown> | undefined)?.[APPLE_STATE_COOKIE]);
  res.clearCookie(APPLE_STATE_COOKIE, { path: APPLE_STATE_COOKIE_PATH, secure: true, sameSite: 'none' });
  const finish = (result: 'ok' | 'cancelled' | 'failed') => res.redirect(303, `/login?appleAuth=${result}`);

  if (str(body.error)) { finish('cancelled'); return; }

  const stateOk = state.length >= 16 && state.length <= 200 && state.length === cookieState.length &&
    crypto.timingSafeEqual(Buffer.from(state), Buffer.from(cookieState));
  const idToken = str(body.id_token);
  if (!stateOk || !idToken || idToken.length > 5000) {
    logger.warn('[auth] apple callback rejected', { stateOk, hasToken: !!idToken });
    finish('failed');
    return;
  }

  // השם נשלח מאפל רק בכניסה הראשונה, כ-JSON בשדה user
  let name: string | undefined;
  try {
    const user = JSON.parse(str(body.user) || 'null') as { name?: { firstName?: string; lastName?: string } } | null;
    name = [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(' ').trim().slice(0, 50) || undefined;
  } catch { /* בלי שם - לא קריטי */ }

  try {
    const { ipAddress, userAgent } = getClientInfo(req);
    const platform = parseLoginPlatform(state.split('.')[1]);
    const result = await authService.appleAuth({ idToken, ...(name ? { name } : {}) }, ipAddress, userAgent, platform);
    setRefreshCookie(res, result.tokens.refreshToken);
    finish('ok');
  } catch (err) {
    logger.warn('[auth] apple callback login failed', { error: (err as Error).message });
    finish('failed');
  }
};

/**
 * POST /api/auth/refresh
 * רענון access token באמצעות refresh token.
 * - טוקן לא תקף/פג תוקף → 401 (הלקוח מתנתק)
 * - race מול בקשת רענון מקבילה שכבר סובבה את הטוקן → 409 (הלקוח מנסה שוב,
 *   לא מתנתק - ראו ההערה על RefreshResult ב-token.service.ts)
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // קורא מ-cookie (httpOnly) ראשית, עם fallback לגוף הבקשה לתאימות אחורה
  const refreshTokenValue: string =
    (req.cookies as Record<string, string>)[REFRESH_COOKIE] ||
    (req.body as { refreshToken?: string }).refreshToken || '';
  if (!refreshTokenValue) throw AuthError.invalidToken();
  const result = await refreshAccessToken(refreshTokenValue);
  if (result.status === 'invalid') throw AuthError.invalidToken();
  if (result.status === 'race') throw new ConflictError('Refresh already in progress, retry');
  setRefreshCookie(res, result.tokens.refreshToken);
  res.json({ success: true, data: result.tokens });
});

/**
 * POST /api/auth/log-app-open
 * רישום פתיחת אפליקציה (metric). דורש משתמש מחובר.
 * הכתיבה ל-DB רצה ברקע - התגובה מיידית (204).
 */
export const logAppOpen = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { ipAddress, userAgent, platform } = getClientInfo(req);

  LoginActivityDAL.logActivity({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    loginMethod: 'app_open',
    platform,
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
  const refreshTokenValue: string =
    (req.cookies as Record<string, string>)[REFRESH_COOKIE] ||
    (req.body as { refreshToken?: string }).refreshToken || '';
  clearRefreshCookie(res);
  if (refreshTokenValue) await invalidateRefreshToken(refreshTokenValue);
  res.json({ success: true, message: 'Logged out successfully' });
});
