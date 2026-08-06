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

// הגבלת עוזר ה-AI - 20 הודעות לשעה למשתמש (fallback ל-IP). קריאה ל-NVIDIA
// NIM (מפתח חיצוני, מכסה משותפת לכל האפליקציה) - בלי הגבלה פר-משתמש,
// משתמש בודד יכול לרוקן את כל המכסה, אותו עיקרון כמו ocrLimiter.
export const aiAssistantLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many AI assistant requests, please try again later',
  },
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
