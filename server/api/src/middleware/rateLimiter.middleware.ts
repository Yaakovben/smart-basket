import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';

// מזהה לצורך rate-limit: משתמש מאומת נספר לפי ה-user id שלו, לא לפי IP.
// קריטי בסקייל - מאות משתמשים ברשת סלולרית חולקים מעט כתובות IP (CGNAT),
// ועם מפתח-IP הם היו ממלאים יחד דלי אחד ונחסמים בטעות ("יותר מדי בקשות"
// כבר בטעינה הראשונה). בקשות לא-מאומתות (login/register/health/check-email)
// עדיין נספרות לפי IP עם תקרה נמוכה יותר; ההגנה מ-brute-force מסופקת ע"י
// loginLimiter/registerLimiter/authLimiter הייעודיים.
interface RateIdentity { key: string; authed: boolean }

function rateIdentity(req: Request): RateIdentity {
  const cached = (req as Request & { _rateIdentity?: RateIdentity })._rateIdentity;
  if (cached) return cached;

  let identity: RateIdentity = { key: `ip:${req.ip ?? 'unknown'}`, authed: false };
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.slice(7), env.JWT_ACCESS_SECRET) as { userId?: string };
      if (decoded.userId) identity = { key: `u:${decoded.userId}`, authed: true };
    } catch {
      // טוקן פג/לא תקין - נשארים על מפתח IP
    }
  }

  (req as Request & { _rateIdentity?: RateIdentity })._rateIdentity = identity;
  return identity;
}

// הגבלת קצב כללית ל-API - תקרה נדיבה למשתמש מאומת (טעינת אפליקציה + רענוני
// טוקן + שימוש פעיל לא מתקרבים לזה), הדוקה יותר לתעבורה אנונימית פר-IP.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: (req: Request) => (rateIdentity(req).authed ? 1000 : 200),
  keyGenerator: (req: Request) => rateIdentity(req).key,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// הגבלת קצב כללית לנתיבי אימות.
// משמשת את כל /api/auth/* כולל check-email, refresh, logout, app-open.
// אבטחה אמיתית נגד brute-force מסופקת ע״י loginLimiter (5/15min).
// לכן כאן הגבול רחב יותר — 100 בקשות ל-15 דק׳, מה שמאפשר:
// boot של האפליקציה + רענוני טוקן סדירים + הפעלות מרובות מאותו IP (NAT/משפחה)
// בלי להיחסם.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 100,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // לא סופרים רענוני טוקן מוצלחים — מונע חסימה של משתמש תקף
  skipSuccessfulRequests: true,
});

// הגבלת התחברות - 5 ניסיונות ל-15 דקות
// מונע התקפות brute-force
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts, please try again in 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // לא סופר התחברויות מוצלחות
});

// הגבלת הרשמה - 30 ניסיונות לשעה, רישום מוצלח לא נספר.
// מונע ספאם בלבד; משתמש לגיטימי שמתקן שדות בוולידציה (סיסמה קצרה,
// מייל לא תקין, שם תפוס) לא ייחסם. גם משפחה מאותו IP יכולה להירשם.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// הגבלת שינוי סיסמה - 5 ניסיונות לשעה
// מונע ניחוש סיסמה נוכחית
export const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password change attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// הגבלת הצטרפות - 10 ניסיונות ל-15 דקות
// מונע ניחוש קודי הזמנה
export const joinGroupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many join attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// הגבלת OCR - 10 סריקות לשעה למשתמש (fallback ל-IP אם משום מה אין req.user).
// OCR.space free tier מוגבל ל-2,500 בקשות/חודש לכל האפליקציה (engine 3,
// ראו ocr.service.ts) - בלי הגבלה פר-משתמש, משתמש בודד יכול לרוקן את כל
// המכסה החודשית תוך דקות.
export const ocrLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many OCR requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as { user?: { id?: string } }).user?.id || req.ip || 'unknown',
});

// הגבלת עוזר ה-AI - 20 הודעות לשעה למשתמש (fallback ל-IP). קריאה לספקי
// AI חיצוניים (מכסה משותפת לכל האפליקציה) - בלי הגבלה פר-משתמש בצד הספק,
// משתמש בודד יכול לרוקן את כל המכסה, אותו עיקרון כמו ocrLimiter.
// message כפונקציה (לא אובייקט קבוע) כדי לצרף את זמן האיפוס בפועל
// (req.rateLimit.resetTime, זמין הודות ל-standardHeaders) - כך הלקוח יכול
// להציג "מתחדש בעוד X דקות" במקום הודעת שגיאה סתמית.
export const aiAssistantLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: (req: Request) => ({
    success: false,
    message: 'Too many AI assistant requests, please try again later',
    resetAt: (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime?.toISOString() ?? null,
  }),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as { user?: { id?: string } }).user?.id || req.ip || 'unknown',
});

// הגבלת התראות - מניעת spam של push notifications מצד לקוח זדוני.
// 60 התראות לדקה זה הרבה יותר ממקסימום שימוש לגיטימי (סוקט מפעיל ~10/דקה בעומס גבוה).
export const notificationCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many notification requests',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
