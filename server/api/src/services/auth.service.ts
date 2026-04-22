/**
 * auth.service.ts
 *
 * לוגיקת אימות המשתמשים: register, login, Google OAuth, refresh, logout.
 * כל פונקציה מחזירה זוג טוקנים (access + refresh) ובמקרה של login/register גם
 * את פרטי המשתמש.
 */

import { UserDAL, LoginActivityDAL } from '../dal';
import { ConflictError, AuthError } from '../errors';
import { sanitizeText } from '../utils';
import { createTokens, refreshAccessToken, invalidateRefreshToken } from './token.service';
import { env } from '../config';
import type { RegisterInput, LoginInput } from '../validators';
import type { AuthTokens, IUserResponse } from '../types';

interface GoogleUserInfo {
  sub: string;
  name: string;
  email: string;
  email_verified?: boolean;
  picture?: string;
}

// ====================== עזר פנימי ======================

// יצירת טוקנים + רישום פעילות כניסה ב-log
async function createTokensAndLog(
  userId: string, email: string, name: string,
  loginMethod: 'email' | 'google', ipAddress?: string, userAgent?: string
): Promise<AuthTokens> {
  const tokens = await createTokens(userId, email, name);
  await LoginActivityDAL.logActivity({ userId, userName: name, userEmail: email, loginMethod, ipAddress, userAgent });
  return tokens;
}

// ====================== API ציבורי ======================

/**
 * בדיקה מקדימה אם מייל קיים במערכת, ואם הוא חשבון Google בלבד.
 * משמש את מסך הכניסה לזהות איזה סוג חשבון לפתוח.
 */
export async function checkEmail(email: string): Promise<{ exists: boolean; isGoogleAccount: boolean }> {
  // חובה findByEmailWithPassword כי password מוגדר select: false
  const user = await UserDAL.findByEmailWithPassword(email);
  if (!user) return { exists: false, isGoogleAccount: false };

  // חשבון Google-בלבד = קיים googleId אך אין סיסמה מקומית
  const isGoogleAccount = !!(user.googleId && !user.password);
  return { exists: true, isGoogleAccount };
}

/**
 * יצירת חשבון חדש עם מייל + סיסמה. אם המייל כבר קיים — ConflictError.
 * אם המייל תואם ל-ADMIN_EMAIL מה-env — המשתמש מקבל isAdmin=true.
 */
export async function register(
  data: RegisterInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
  const existingUser = await UserDAL.findByEmail(data.email);
  if (existingUser) throw ConflictError.emailExists();

  const isAdmin = data.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

  const user = await UserDAL.create({
    name: sanitizeText(data.name),
    email: data.email.toLowerCase(),
    password: data.password,
    isAdmin,
  });

  const tokens = await createTokensAndLog(user._id.toString(), user.email, user.name, 'email', ipAddress, userAgent);
  return { user: user.toJSON() as IUserResponse, tokens };
}

/**
 * כניסה עם מייל + סיסמה.
 * שגיאה אחידה (AuthError.invalidCredentials) לכל כישלון — מונע הסקת קיום חשבון.
 */
export async function login(
  data: LoginInput,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
  const user = await UserDAL.findByEmailWithPassword(data.email);
  if (!user || !user.password) throw AuthError.invalidCredentials();

  const isMatch = await user.comparePassword(data.password);
  if (!isMatch) throw AuthError.invalidCredentials();

  const tokens = await createTokensAndLog(user._id.toString(), user.email, user.name, 'email', ipAddress, userAgent);
  return { user: user.toJSON() as IUserResponse, tokens };
}

/**
 * כניסה/הרשמה עם Google OAuth access-token.
 *
 * הזרימה:
 *  1. שולפים פרטי המשתמש מ-Google API
 *  2. מאמתים ש-email_verified === true
 *  3. מחפשים משתמש לפי googleId, אחר כך לפי email
 *  4. אם לא נמצא — יוצרים חדש עם avatarColor כחול-Google
 *  5. אם נמצא חשבון email ללא googleId — מקשרים אותם אטומית
 *  6. מחזירים טוקנים ו-user
 */
export async function googleAuth(
  data: { accessToken: string },
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
  // שליפת פרטי משתמש מ-Google
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: { Authorization: `Bearer ${data.accessToken}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) throw AuthError.googleAuthFailed();

  const googleUser = (await response.json()) as GoogleUserInfo;

  // אימות שדות חובה מ-Google
  if (!googleUser.sub || !googleUser.email || !googleUser.name) {
    throw AuthError.googleAuthFailed();
  }
  if (googleUser.email_verified !== true) throw AuthError.googleAuthFailed();

  // מציאת או יצירת משתמש
  let user = await UserDAL.findByGoogleId(googleUser.sub);
  if (!user) user = await UserDAL.findByEmail(googleUser.email);

  const isAdmin = googleUser.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();

  if (!user) {
    user = await UserDAL.create({
      name: sanitizeText(googleUser.name),
      email: googleUser.email.toLowerCase(),
      googleId: googleUser.sub,
      avatarColor: '#4285F4', // כחול של Google
      isAdmin,
    });
  } else if (!user.googleId) {
    // קישור חשבון אימייל קיים ל-Google
    await UserDAL.updateById(user._id.toString(), { googleId: googleUser.sub });
    user.googleId = googleUser.sub;
  }

  const tokens = await createTokensAndLog(user._id.toString(), user.email, user.name, 'google', ipAddress, userAgent);
  return { user: user.toJSON() as IUserResponse, tokens };
}

/**
 * רענון access token באמצעות refresh token.
 * מחזיר null אם ה-refresh פג תוקף / לא תקף.
 */
export async function refreshToken(refreshTokenValue: string): Promise<AuthTokens | null> {
  return refreshAccessToken(refreshTokenValue);
}

/**
 * יציאה מהמערכת — ביטול ה-refresh token הנוכחי בלבד.
 */
export async function logout(refreshTokenValue: string): Promise<void> {
  await invalidateRefreshToken(refreshTokenValue);
}
