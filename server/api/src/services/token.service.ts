/**
 * token.service.ts
 *
 * אחראי על מחזור החיים של JWT access tokens ו-refresh tokens.
 * - Access token: JWT חתום, חיים קצרים (15 דק׳ בד״כ), לא נשמר ב-DB
 * - Refresh token: מחרוזת אקראית של 64 בתים, נשמרת ב-DB עם תפוגה של 90 יום
 *
 * Rotation: בכל refresh, יוצרים refresh token חדש ומחליפים את הישן אטומית
 * (מניעת race condition אם שני refresh מקבילים מגיעים).
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenDAL } from '../dal';
import { env } from '../config';
import type { TokenPayload, AuthTokens } from '../types';

// ============== יצירה ==============

/**
 * יוצר access token חדש עם payload של המשתמש.
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * יוצר refresh token אקראי (מחרוזת הקס של 128 תווים).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * יוצר זוג טוקנים (access + refresh) עבור login/register.
 * ה-refresh נשמר ב-DB עם תפוגה של 90 יום.
 */
export async function createTokens(userId: string, email: string, name: string): Promise<AuthTokens> {
  const payload: TokenPayload = { userId, email, name };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();

  // תפוגה: 90 יום מעכשיו
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  await TokenDAL.createToken(userId, refreshToken, expiresAt);
  return { accessToken, refreshToken };
}

// ============== רענון ==============

/**
 * מחליף refresh token בזוג טוקנים חדש (rotation אטומי).
 *
 * מחזיר null אם:
 *  - הטוקן לא קיים / פג תוקפו
 *  - המשתמש נמחק בינתיים
 *  - race condition (בקשה מקבילה כבר החליפה את הטוקן)
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
  const tokenDoc = await TokenDAL.findByTokenPopulated(refreshToken);

  // טוקן לא קיים או פג תוקף → מנקים אם נמצא ומחזירים null
  if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
    if (tokenDoc) await tokenDoc.deleteOne();
    return null;
  }

  const user = tokenDoc.user as unknown as { _id: string; email: string; name: string } | null;

  // המשתמש נמחק — ניקוי טוקן יתום
  if (!user) {
    await tokenDoc.deleteOne();
    return null;
  }

  const userId = user._id.toString();
  const newAccessToken = generateAccessToken({ userId, email: user.email, name: user.name });
  const newRefreshToken = generateRefreshToken();

  // עדכון אטומי — מצליח רק אם הטוקן הישן עדיין קיים.
  // מונע מצב שבו שתי בקשות refresh בו-זמנית ישתמשו באותו טוקן.
  const updated = await TokenDAL.rotateToken(
    tokenDoc._id.toString(),
    refreshToken,
    newRefreshToken,
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  );

  // בקשה מקבילה כבר הספיקה להחליף את הטוקן
  if (!updated) return null;

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ============== ביטול ==============

/**
 * מבטל refresh token ספציפי (logout מהמכשיר הנוכחי).
 */
export async function invalidateRefreshToken(refreshToken: string): Promise<void> {
  await TokenDAL.deleteByToken(refreshToken);
}

/**
 * מבטל את כל ה-refresh tokens של המשתמש (logout מכל המכשירים).
 * משמש ב-changePassword ו-deleteAccount.
 */
export async function invalidateAllUserTokens(userId: string): Promise<void> {
  await TokenDAL.deleteByUser(userId);
}

// ============== אימות ==============

/**
 * מאמת access token. מחזיר payload אם תקין, null אחרת.
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
