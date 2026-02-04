import * as Sentry from '@sentry/node';
import app from './app';
import { env, connectDatabase } from './config';

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
  console.log('Sentry error monitoring initialized');
}

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log('Connected to MongoDB');

    // Start the server
    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    Sentry.captureException(error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  Sentry.captureException(reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  Sentry.captureException(error);
  process.exit(1);
});

startServer();
