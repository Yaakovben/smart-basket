import { z } from 'zod';
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
const envSchema = z.object({
  // Application environment - controls logging, error details, and Sentry
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server port
  PORT: z.string().transform(Number).default('5000'),

  // MongoDB connection string
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),

  // JWT secrets for token signing (must be strong, random strings)
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT access secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),

  // Token expiration times
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth - get from Google Cloud Console
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),

  // CORS - comma-separated list of allowed origins (e.g., "https://app.com,https://www.app.com")
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Default admin email
  ADMIN_EMAIL: z.string().email().default('yaakovbenyizchak1@gmail.com'),

  // Sentry error monitoring - get DSN from sentry.io project settings
  // Errors are only sent when NODE_ENV=production
  SENTRY_DSN: z.string().optional(),

  // Web Push VAPID keys - generate with: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_EMAIL: z.string().startsWith('mailto:').default('mailto:yaakovbenyizchak1@gmail.com'),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
};

export const env = parseEnv();

export type Environment = z.infer<typeof envSchema>;
