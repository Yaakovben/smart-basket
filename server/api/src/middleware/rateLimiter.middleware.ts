import rateLimit from 'express-rate-limit';

// הגבלת קצב כללית ל-API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 100, // 100 בקשות לחלון
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

// הגבלת הרשמה - 10 ניסיונות לשעה
// מונע ספאם, אך סובלני למשתמשים שנכשלים בוולידציה או מתקנים שדות
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
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
