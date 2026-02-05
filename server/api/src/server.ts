import * as Sentry from '@sentry/node';
import app from './app';
import { env, connectDatabase, logger } from './config';

// Initialize Sentry error monitoring (must be first)
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Only send errors in production
    enabled: env.NODE_ENV === 'production',
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
  });
  logger.info('Sentry error monitoring initialized');
}

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('Connected to MongoDB');

    // Start the server
    app.listen(env.PORT, () => {
      logger.info(`API server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    Sentry.captureException(error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections - log and continue
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  Sentry.captureException(reason);
});

// Handle uncaught exceptions - log and exit (state may be corrupted)
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - server will restart:', error);
  Sentry.captureException(error);
  process.exit(1);
});

startServer();
