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

// הגבלת קצב כללית לכל נתיבי אימות
router.use(authLimiter);

// POST /api/auth/check-email - בדיקת קיום מייל (לפני register/login)
router.post('/check-email', validate(authValidator.checkEmail), checkEmail);

// POST /api/auth/register - הרשמה עם מייל + סיסמה
router.post('/register', registerLimiter, validate(authValidator.register), register);

// POST /api/auth/login - כניסה עם מייל + סיסמה
router.post('/login', loginLimiter, validate(authValidator.login), login);

// POST /api/auth/google - כניסה/הרשמה עם Google OAuth
router.post('/google', loginLimiter, validate(authValidator.googleAuth), googleAuth);

// POST /api/auth/refresh - רענון access token מתוך refresh token
router.post('/refresh', validate(authValidator.refreshToken), refreshToken);

// POST /api/auth/logout - יציאה (ביטול refresh token נוכחי)
router.post('/logout', validate(authValidator.refreshToken), logout);

// POST /api/auth/app-open - רישום פתיחת אפליקציה (metric), דורש אימות
router.post('/app-open', authenticate, logAppOpen);

export default router;
