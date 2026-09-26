import Joi from 'joi';
import { commonSchemas } from './common.validator';

export const authValidator = {
  register: Joi.object({
    name: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
  }),

  checkEmail: Joi.object({
    email: commonSchemas.email.required(),
  }),

  // באתר מגיע accessToken (זרימת הדפדפן). באפליקציה הנייטיב מגיע idToken
  // מההתחברות המובנית של המכשיר. בדיוק אחד מהשניים.
  googleAuth: Joi.object({
    accessToken: Joi.string().min(1),
    idToken: Joi.string().min(1),
  }).xor('accessToken', 'idToken').messages({
    'object.missing': 'Access token is required',
    'object.xor': 'Send either accessToken or idToken',
  }),

  // ה-refresh token מגיע בעיקר מ-cookie httpOnly; הגוף אופציונלי (תאימות אחורה).
  // הקונטרולר מחזיר 401 אם אין טוקן לא ב-cookie ולא בגוף.
  refreshToken: Joi.object({
    refreshToken: Joi.string().allow('').optional(),
  }),
};

// ייצוא טיפוסים
export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type CheckEmailInput = {
  email: string;
};

export type GoogleAuthInput = {
  accessToken?: string;
  idToken?: string;
};

export type RefreshTokenInput = {
  refreshToken: string;
};
