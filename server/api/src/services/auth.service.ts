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
import { createTokens } from './token.service';
import { newUserTrialFields } from './subscription.service';
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
  userId: string, email: string, name: string, tokenVersion: number,
  loginMethod: 'email' | 'google', ipAddress?: string, userAgent?: string
): Promise<AuthTokens> {
  const tokens = await createTokens(userId, email, name, tokenVersion);
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

// isAdmin רק אם ADMIN_EMAIL מוגדר *ותואם*. אם ADMIN_EMAIL ריק/לא מוגדר -
// אף אחד לא מקבל אדמין (ה-env כבר מוחזר lowercase מ-Joi).
const matchesAdminEmail = (email: string): boolean =>
  !!env.ADMIN_EMAIL && email.toLowerCase() === env.ADMIN_EMAIL;

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

  const isAdmin = matchesAdminEmail(data.email);

  const user = await UserDAL.create({
    name: sanitizeText(data.name),
    email: data.email.toLowerCase(),
    password: data.password,
    isAdmin,
    ...newUserTrialFields(),
  });

  const tokens = await createTokensAndLog(user._id.toString(), user.email, user.name, user.tokenVersion ?? 0, 'email', ipAddress, userAgent);
  return { user: user.toJSON() as unknown as IUserResponse, tokens };
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

  const tokens = await createTokensAndLog(user._id.toString(), user.email, user.name, user.tokenVersion ?? 0, 'email', ipAddress, userAgent);
  return { user: user.toJSON() as unknown as IUserResponse, tokens };
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
// אימות ID token מההתחברות הנייטיב (אנדרואיד/iOS). כאן, בניגוד ל-access
// token, השדה aud אמין ואחיד: זה ה-client ID שביקש את הטוקן, ולכן חוסמים
// אם הוא לא שלנו. גוגל עצמה מאמתת את החתימה והתוקף ב-tokeninfo.
async function googleUserFromIdToken(idToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!response.ok) throw AuthError.googleAuthFailed();
  const info = (await response.json()) as {
    aud?: string; iss?: string; sub?: string; email?: string;
    email_verified?: string | boolean; name?: string; picture?: string;
  };
  const allowedAudiences = [env.GOOGLE_CLIENT_ID, ...env.GOOGLE_NATIVE_CLIENT_IDS.split(',').map(s => s.trim())].filter(Boolean);
  if (!info.aud || !allowedAudiences.includes(info.aud)) throw AuthError.googleAuthFailed();
  if (info.iss !== 'accounts.google.com' && info.iss !== 'https://accounts.google.com') throw AuthError.googleAuthFailed();
  return {
    sub: info.sub ?? '',
    email: info.email ?? '',
    // לחשבונות בלי שם תצוגה בטוקן משתמשים בחלק הראשון של המייל
    name: info.name || (info.email ?? '').split('@')[0],
    email_verified: info.email_verified === true || info.email_verified === 'true',
    picture: info.picture,
  };
}

export async function googleAuth(
  data: { accessToken?: string; idToken?: string },
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
  const googleUser = data.idToken
    ? await googleUserFromIdToken(data.idToken)
    : await googleUserFromAccessToken(data.accessToken ?? '');
  return completeGoogleAuth(googleUser, ipAddress, userAgent);
}

async function googleUserFromAccessToken(accessToken: string): Promise<GoogleUserInfo> {
  // בדיקת audience ב-fire-and-forget: לוג בלבד, ללא חסימה.
  // תוקן בחזרה ל-log-only ב-2026-09-20: הגרסה החוסמת (aud/azp !==
  // GOOGLE_CLIENT_ID => throw) התבררה כתקרית פרודקשן חמורה - חסמה כניסת
  // Google לחלק ניכר מהמשתמשים. כפי שהוזהר כאן במקור: הפורמט של aud/azp
  // בתגובת tokeninfo לגבי access token (בניגוד ל-ID token) אינו אחיד בין
  // client_id string ל-project number, ואף שגיאת HTTP חולפת מ-Google
  // (rate limit/5xx) הייתה חוסמת התחברות באופן גורף. אין לחסום שוב בלי
  // לאמת קודם בלוגים על פני מדגם רחב של כניסות אמיתיות.
  fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    { signal: AbortSignal.timeout(5000) }
  )
    .then(r => r.json())
    .then((info: unknown) => {
      const ti = info as { aud?: string; azp?: string; error?: string };
      const expected = env.GOOGLE_CLIENT_ID;
      if (expected) {
        const matches = ti.aud === expected || ti.azp === expected;
        if (!matches) {
          console.warn('[googleAuth] audience mismatch (לוג בלבד)', {
            aud: ti.aud, azp: ti.azp, expected, error: ti.error,
          });
        }
      }
    })
    .catch(() => { /* tokeninfo לא קריטי */ });

  // שליפת פרטי משתמש מ-Google
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) throw AuthError.googleAuthFailed();

  return (await response.json()) as GoogleUserInfo;
}

async function completeGoogleAuth(
  googleUser: GoogleUserInfo,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: IUserResponse; tokens: AuthTokens }> {
  // אימות שדות חובה מ-Google
  if (!googleUser.sub || !googleUser.email || !googleUser.name) {
    throw AuthError.googleAuthFailed();
  }
  if (googleUser.email_verified !== true) throw AuthError.googleAuthFailed();

  // מציאת או יצירת משתמש
  let user = await UserDAL.findByGoogleId(googleUser.sub);
  if (!user) user = await UserDAL.findByEmail(googleUser.email);

  const isAdmin = matchesAdminEmail(googleUser.email);

  if (!user) {
    user = await UserDAL.create({
      name: sanitizeText(googleUser.name),
      email: googleUser.email.toLowerCase(),
      googleId: googleUser.sub,
      avatarColor: '#4285F4', // כחול של Google
      isAdmin,
      ...newUserTrialFields(),
    });
  } else if (!user.googleId) {
    // קישור חשבון אימייל קיים ל-Google. Google כבר אימת ש-googleUser.email
    // שייך בפועל למי שמבצע את הקישור הזה (email_verified נבדק למעלה) - לכן
    // אם לחשבון יש סיסמה מקומית, מבטלים אותה ומגדילים tokenVersion (מנתק
    // סשנים קיימים). בלי זה, מי שנרשם קודם עם המייל הזה בסיסמה בלבד
    // (register() לא מאמת בעלות על מייל) יכול היה להמשיך ולהתחבר עם אותה
    // סיסמה גם אחרי שהבעלים האמיתי קישר את Google - השתלטות שקטה על חשבון.
    const update: Record<string, unknown> = { googleId: googleUser.sub };
    const hadPassword = !!user.password;
    if (hadPassword) {
      update.$unset = { password: '' };
      update.$inc = { tokenVersion: 1 };
    }
    await UserDAL.updateById(user._id.toString(), update);
    user.googleId = googleUser.sub;
    // מעדכנים גם באובייקט המקומי - אחרת הטוקן שמונפק כאן למטה נחתם עם
    // tokenVersion הישן, וייכשל מיד ב-401 מול הערך המעודכן ב-DB
    if (hadPassword) user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  }

  const tokens = await createTokensAndLog(user._id.toString(), user.email, user.name, user.tokenVersion ?? 0, 'google', ipAddress, userAgent);
  return { user: user.toJSON() as unknown as IUserResponse, tokens };
}
