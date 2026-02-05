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
  // Application environment - controls logging, error details, and Sentry
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // Server port
  PORT: Joi.number().default(5000),

  // MongoDB connection string
  MONGODB_URI: Joi.string().required().messages({
    'any.required': 'MongoDB URI is required',
  }),

  // JWT secrets for token signing (must be strong, random strings)
  JWT_ACCESS_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT access secret must be at least 32 characters',
    'any.required': 'JWT access secret is required',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT refresh secret must be at least 32 characters',
    'any.required': 'JWT refresh secret is required',
  }),

  // Token expiration times
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Google OAuth - get from Google Cloud Console
  GOOGLE_CLIENT_ID: Joi.string().required().messages({
    'any.required': 'Google Client ID is required',
  }),

  // CORS - comma-separated list of allowed origins (e.g., "https://app.com,https://www.app.com")
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // Default admin email
  ADMIN_EMAIL: Joi.string().email().default('yaakovbenyizchak1@gmail.com'),

  // Sentry error monitoring - get DSN from sentry.io project settings
  // Errors are only sent when NODE_ENV=production
  SENTRY_DSN: Joi.string().optional(),

  // Web Push VAPID keys - generate with: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: Joi.string().optional(),
  VAPID_PRIVATE_KEY: Joi.string().optional(),
  VAPID_EMAIL: Joi.string().pattern(/^mailto:/).default('mailto:yaakovbenyizchak1@gmail.com'),

  // Redis URL for caching (optional) - format: redis://[[username][:password]@][host][:port][/db-number]
  REDIS_URL: Joi.string().optional(),
}).unknown(true); // Allow other env variables

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
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL: string;
  REDIS_URL?: string;
}

export const env = parseEnv();
