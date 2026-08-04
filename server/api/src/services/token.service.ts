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
function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * יוצר refresh token אקראי (מחרוזת הקס של 128 תווים).
 */
function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * יוצר זוג טוקנים (access + refresh) עבור login/register.
 * ה-refresh נשמר ב-DB עם תפוגה של 90 יום.
 */
export async function createTokens(userId: string, email: string, name: string, tokenVersion: number): Promise<AuthTokens> {
  const payload: TokenPayload = { userId, email, name, tokenVersion };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken();

  // תפוגה: 90 יום מעכשיו
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  await TokenDAL.createToken(userId, refreshToken, expiresAt);
  return { accessToken, refreshToken };
}

// ============== רענון ==============

// חלון חסד אחרי rotation - טוקן שהוחלף עדיין "עובד" לזמן קצר הזה, כדי
// שרענון שהצליח בשרת אבל איבד את התשובה ברשת (קליטה גרועה) לא ינתק את
// המשתמש. ראה RefreshToken.model.ts + findByPreviousToken.
const ROTATION_GRACE_MS = 60 * 1000;

// תוצאת רענון: מבחינה בין "הטוקן באמת לא תקף" (המשתמש חייב להתחבר מחדש)
// לבין "בקשה מקבילה כבר סובבה את הטוקן" (race זמני - הלקוח צריך לנסות שוב,
// לא להתנתק). לפני התיקון שתי הסיבות חזרו כ-null זהה, וה-controller המיר
// את שתיהן לאותה שגיאת 401 גנרית - לקוח שממצה את תקציב ה-retry שלו (למשל
// כמה טאבים/מופעי PWA שמרעננים כמעט בו-זמנית, או שרת איטי אחרי cold-start)
// היה מנקה טוקנים ומתנתק על race שהיה נפתר תוך שניות אם היה עוד ניסיון.
export type RefreshResult =
  | { status: 'ok'; tokens: AuthTokens }
  | { status: 'race' } // בקשה מקבילה כבר החליפה את הטוקן - ננסה שוב, לא מנתקים
  | { status: 'invalid' }; // הטוקן לא קיים/פג תוקף/יתום - התנתקות אמיתית

/**
 * מחליף refresh token בזוג טוקנים חדש (rotation אטומי).
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  let tokenDoc = await TokenDAL.findByTokenPopulated(refreshToken);
  let isReplay = false;

  if (!tokenDoc) {
    // אולי זה replay של טוקן שכבר סובב - תשובת הרענון הקודמת אבדה ברשת
    // אצל הלקוח, אבל הרענון עצמו כבר הצליח בשרת. בתוך חלון החסד מחזירים
    // את הזוג הנוכחי במקום לדחות, כדי לא לנתק על בעיית רשת חולפת.
    tokenDoc = await TokenDAL.findByPreviousToken(refreshToken);
    isReplay = true;
  } else if (tokenDoc.expiresAt < new Date()) {
    // טוקן פג תוקף לגמרי - מנקים ומחזירים invalid
    await tokenDoc.deleteOne();
    return { status: 'invalid' };
  }

  if (!tokenDoc) return { status: 'invalid' };

  const user = tokenDoc.user as unknown as { _id: string; email: string; name: string; tokenVersion: number } | null;

  // המשתמש נמחק — ניקוי טוקן יתום
  if (!user) {
    await tokenDoc.deleteOne();
    return { status: 'invalid' };
  }

  const userId = user._id.toString();
  const newAccessToken = generateAccessToken({ userId, email: user.email, name: user.name, tokenVersion: user.tokenVersion ?? 0 });

  // replay בתוך חלון החסד: לא מסובבים שוב (זה יכתוב-דריסה על סיבוב אמיתי
  // ומחדש את שרשרת ה-replay) - רק מנפיקים access token טרי לאותו refresh
  // token הנוכחי, שכבר פעיל.
  if (isReplay) {
    return { status: 'ok', tokens: { accessToken: newAccessToken, refreshToken: tokenDoc.token } };
  }

  const newRefreshToken = generateRefreshToken();

  // עדכון אטומי — מצליח רק אם הטוקן הישן עדיין קיים.
  // מונע מצב שבו שתי בקשות refresh בו-זמנית ישתמשו באותו טוקן.
  const updated = await TokenDAL.rotateToken(
    tokenDoc._id.toString(),
    refreshToken,
    newRefreshToken,
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    ROTATION_GRACE_MS
  );

  // בקשה מקבילה כבר הספיקה להחליף את הטוקן - race זמני, לא כשל אימות אמיתי
  if (!updated) return { status: 'race' };

  return { status: 'ok', tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken } };
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
