import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

/**
 * API Server Environment Variables
 * ================================
 *
 * Required:
 * - NODE_ENV: Application environment (development/production/test)
 * - PORT: Server port number
 * - MONGODB_URI: MongoDB connection string (e.g., mongodb+srv://...@cluster.mongodb.net/dbname)
 * - JWT_ACCESS_SECRET: Secret key for signing access tokens (min 32 chars)
 * - JWT_REFRESH_SECRET: Secret key for signing refresh tokens (min 32 chars)
 * - GOOGLE_CLIENT_ID: Google OAuth Client ID for authentication
 *
 * Optional:
 * - JWT_ACCESS_EXPIRES_IN: Access token expiry (default: 15m)
 * - JWT_REFRESH_EXPIRES_IN: Refresh token expiry (default: 7d)
 * - CORS_ORIGIN: Allowed origins for CORS, comma-separated (default: http://localhost:5173)
 * - ADMIN_EMAIL: Default admin user email
 * - SENTRY_DSN: Sentry error monitoring DSN (only sends errors in production)
 */
const envSchema = Joi.object({
  // סביבת ריצה
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // פורט השרת
  PORT: Joi.number().default(5000),

  // חיבור ל-MongoDB
  MONGODB_URI: Joi.string().required().messages({
    'any.required': 'MongoDB URI is required',
  }),

  // מפתחות JWT לחתימת טוקנים
  JWT_ACCESS_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT access secret must be at least 32 characters',
    'any.required': 'JWT access secret is required',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT refresh secret must be at least 32 characters',
    'any.required': 'JWT refresh secret is required',
  }),

  // זמני תפוגה
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().required().messages({
    'any.required': 'Google Client ID is required',
  }),

  // CORS - רשימת origins מופרדת בפסיקים
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // מייל אדמין
  ADMIN_EMAIL: Joi.string().email().default('yaakovbenyizchak1@gmail.com'),

  // ניטור שגיאות Sentry - שולח רק ב-production
  SENTRY_DSN: Joi.string().optional(),

  // Logtail (BetterStack) - שליחת לוגים לענן
  LOGTAIL_TOKEN: Joi.string().optional(),

  // מפתחות VAPID להתראות push - ליצירה: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: Joi.string().optional(),
  VAPID_PRIVATE_KEY: Joi.string().optional(),
  VAPID_EMAIL: Joi.string().pattern(/^mailto:/).default('mailto:yaakovbenyizchak1@gmail.com'),
}).unknown(true); // מאפשר משתני סביבה נוספים

const parseEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    console.error('Invalid environment variables:');
    error.details.forEach((detail) => {
      console.error(`  - ${detail.path.join('.')}: ${detail.message}`);
    });
    process.exit(1);
  }

  return value as Environment;
};

export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGODB_URI: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  GOOGLE_CLIENT_ID: string;
  CORS_ORIGIN: string;
  ADMIN_EMAIL: string;
  SENTRY_DSN?: string;
  LOGTAIL_TOKEN?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL: string;
}

export const env = parseEnv();
