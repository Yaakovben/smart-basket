import dotenv from 'dotenv';

dotenv.config();

/**
 * Socket Server Environment Variables
 * ====================================
 *
 * Required:
 * - PORT: Socket server port (default: 5001)
 * - NODE_ENV: Application environment (development/production)
 * - JWT_ACCESS_SECRET: Same secret as API server - for verifying access tokens
 *
 * Optional:
 * - REDIS_URL: Redis connection URL for cross-server communication (e.g., redis://localhost:6379)
 *              Required for multi-instance deployments
 * - CORS_ORIGIN: Allowed origins for CORS, comma-separated (default: http://localhost:5173)
 * - API_URL: API server URL for persisting notifications (default: http://localhost:5000/api)
 * - SENTRY_DSN: Sentry error monitoring DSN (only sends errors in production)
 */
export const env = {
  // Server port - should be different from API server
  PORT: parseInt(process.env.PORT || '5001', 10),

  // Application environment - controls Sentry and logging
  NODE_ENV: process.env.NODE_ENV || 'development',

  // JWT secret - MUST match the API server's JWT_ACCESS_SECRET
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',

  // Redis URL for pub/sub between multiple socket server instances
  // Format: redis://[[username][:password]@][host][:port][/db-number]
  REDIS_URL: process.env.REDIS_URL,

  // CORS - comma-separated list of allowed origins
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // API server URL - Socket server calls this to persist notifications to MongoDB
  API_URL: process.env.API_URL || 'http://localhost:5000/api',

  // Admin email - must match the API server's ADMIN_EMAIL for admin-only socket features
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || '').toLowerCase(),

  // Sentry error monitoring - get DSN from sentry.io project settings
  // Use the same DSN as API server (serverName differentiates them)
  SENTRY_DSN: process.env.SENTRY_DSN,
};

// Validate required env vars
if (!env.JWT_ACCESS_SECRET) {
  console.error('JWT_ACCESS_SECRET is required');
  process.exit(1);
}
