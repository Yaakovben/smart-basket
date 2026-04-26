/**
 * auth.routes.ts
 *
 * נתיבי אימות - register, login, Google, refresh, logout, app-open.
 * מותקן ב-/api/auth.
 *
 * כל נתיב מוגן ב-authLimiter כדי למנוע brute-force.
 * register/login מקבלים עוד שכבת rate-limiting ספציפית.
 */

import { Router } from 'express';
import {
  checkEmail,
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  logAppOpen,
} from '../controllers/auth.controller';
import { validate, authenticate, authLimiter, loginLimiter, registerLimiter } from '../middleware';
import { authValidator } from '../validators';

const router = Router();

// Rate limit מוחל PER-ROUTE, לא על כל /auth/* - כך /refresh ו-/logout
// לא נחסמים כשמשתמש פעיל שולח הרבה בקשות (חזרות מרקע, ריבוי טאבים וכו').
// /refresh כבר מוגן בעצמו (דורש refresh token תקף).

// POST /api/auth/check-email - בדיקת קיום מייל (לפני register/login)
router.post('/check-email', authLimiter, validate(authValidator.checkEmail), checkEmail);

// POST /api/auth/register - הרשמה עם מייל + סיסמה
router.post('/register', authLimiter, registerLimiter, validate(authValidator.register), register);

// POST /api/auth/login - כניסה עם מייל + סיסמה
router.post('/login', authLimiter, loginLimiter, validate(authValidator.login), login);

// POST /api/auth/google - כניסה/הרשמה עם Google OAuth
router.post('/google', authLimiter, loginLimiter, validate(authValidator.googleAuth), googleAuth);

// POST /api/auth/refresh - רענון access token. ללא rate limit - דורש refresh token
// תקף בכל מקרה (self-protected), וסירוב רענון מנתק את המשתמש שלא בצדק.
router.post('/refresh', validate(authValidator.refreshToken), refreshToken);

// POST /api/auth/logout - יציאה. ללא rate limit - חייבת לעבוד תמיד.
router.post('/logout', validate(authValidator.refreshToken), logout);

// POST /api/auth/app-open - רישום פתיחת אפליקציה (metric), דורש אימות
router.post('/app-open', authenticate, logAppOpen);

export default router;
