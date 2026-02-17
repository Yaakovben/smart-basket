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
  // פורט השרת - צריך להיות שונה משרת ה-API
  PORT: parseInt(process.env.PORT || '5001', 10),

  // סביבת ריצה - שולט על Sentry ורמת לוגים
  NODE_ENV: process.env.NODE_ENV || 'development',

  // מפתח JWT - חייב להתאים לשרת ה-API
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',

  // Redis לתקשורת pub/sub בין מופעי שרת
  REDIS_URL: process.env.REDIS_URL,

  // CORS - רשימת origins מופרדים בפסיקים
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // כתובת שרת ה-API - שרת Socket פונה אליו לשמירת התראות ב-MongoDB
  API_URL: process.env.API_URL || 'http://localhost:5000/api',

  // מייל מנהל - חייב להתאים לשרת ה-API
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || '').toLowerCase(),

  // Sentry לניטור שגיאות - אותו DSN כמו שרת ה-API (serverName מבדיל ביניהם)
  SENTRY_DSN: process.env.SENTRY_DSN,
};

// ולידציה של משתני סביבה נדרשים
if (!env.JWT_ACCESS_SECRET) {
  console.error('JWT_ACCESS_SECRET is required');
  process.exit(1);
}
