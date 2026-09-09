import * as Sentry from '@sentry/node';
import mongoose from 'mongoose';
import app from './app';
import { env, connectDatabase, logger } from './config';
import { startPriceSyncJob } from './features/priceComparison';
import { warmGroqModel } from './services/aiAssistant.service';
import { isImageUploadConfigured } from './services/imageUpload.service';

// אתחול Sentry לניטור שגיאות (חייב להיות ראשון)
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    enabled: env.NODE_ENV === 'production',
    tracesSampleRate: 0.1, // 10% מהטרנזקציות
  });
  logger.info('Sentry error monitoring initialized');
}

let server: ReturnType<typeof app.listen>;

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info('Connected to MongoDB');

    server = app.listen(env.PORT, () => {
      logger.info(`API server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      // discovery ברקע — מחמם את cache המודל לפני שמשתמש יגיע
      warmGroqModel();
      // אזהרה מוקדמת: בלי Cloudinary *כל* תמונת מוצר נופלת לאחסון data-URL
      // בתוך Mongo (מנפח את ה-DB). עדיף לדעת בעלייה ולא רק כשמשתמש מתלונן.
      if (!isImageUploadConfigured()) {
        logger.warn('[imageUpload] Cloudinary is NOT configured - every product photo will fall back to a data-URL stored in MongoDB. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.');
      }
    });

    // התחלת cron job לרענון מחירים - בכל סביבה שהיא לא development (dev מקומי).
    // ב-development מומלץ להריץ ידנית `npm run refresh-prices` או דרך פאנל האדמין.
    if (env.NODE_ENV !== 'development') {
      startPriceSyncJob();
    } else {
      logger.info('[price-sync-job] Skipped in local development environment');
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    Sentry.captureException(error);
    process.exit(1);
  }
};

// כיבוי מסודר
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // כיבוי כפוי אחרי 10 שניות
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// טיפול ב-promise rejections לא מטופלים
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  Sentry.captureException(reason);
});

// טיפול ב-exceptions לא מטופלים - השרת יופעל מחדש
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - server will restart:', error);
  Sentry.captureException(error);
  process.exit(1);
});

startServer();
