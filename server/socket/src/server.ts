import * as Sentry from '@sentry/node';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env, logger } from './config';
import { authenticateSocket } from './middleware/auth.middleware';
import { clearRateLimit } from './middleware/rateLimiter.middleware';
import {
  registerListHandlers,
  registerNotificationHandlers,
  registerProductHandlers,
} from './handlers';
import { initRedis, closeRedis } from './services/redis.service';
import type { AuthenticatedSocket, ClientToServerEvents, ServerToClientEvents } from './types';

// Global tracking of connected users: userId → Set<socketId>
// Handles multiple tabs/devices per user correctly
const connectedUsers = new Map<string, Set<string>>();

// Initialize Sentry error monitoring (must be first)
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    serverName: 'socket-server',
    // Only send errors in production
    enabled: env.NODE_ENV === 'production',
    // Performance monitoring
    tracesSampleRate: 0.1,
  });
  logger.info('Sentry error monitoring initialized for Socket server');
}

const httpServer = createServer((req, res) => {
  // Health check endpoint for monitoring services
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  // Default response for other requests
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.io server');
});

// CORS configuration - supports multiple origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list or if wildcard is used
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Authentication middleware
io.use(authenticateSocket);

// Connection handler
io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket;
  const userId = authSocket.userId!;
  logger.info(`User connected: ${userId}`);

  // Join user's personal room for direct notifications
  authSocket.join(`user:${userId}`);

  // Track global connection
  const isNewUser = !connectedUsers.has(userId);
  if (isNewUser) {
    connectedUsers.set(userId, new Set());
  }
  connectedUsers.get(userId)!.add(authSocket.id);

  // Notify admin presence subscribers if this is a new user coming online
  if (isNewUser) {
    io.to('admin:presence').emit('admin:user-connected', { userId });
  }

  // Admin presence: get all online users and subscribe to updates (admin only)
  authSocket.on('get:online-users', () => {
    if (!env.ADMIN_EMAIL || authSocket.email?.toLowerCase() !== env.ADMIN_EMAIL) {
      logger.warn(`Non-admin user ${userId} attempted get:online-users`);
      return;
    }
    authSocket.join('admin:presence');
    authSocket.emit('admin:online-users', {
      userIds: Array.from(connectedUsers.keys()),
    });
  });

  // Admin presence: unsubscribe from updates
  authSocket.on('leave:online-users', () => {
    authSocket.leave('admin:presence');
  });

  // Admin: force all connected clients to clear cache and reload
  authSocket.on('admin:force-refresh', () => {
    if (!env.ADMIN_EMAIL || authSocket.email?.toLowerCase() !== env.ADMIN_EMAIL) {
      logger.warn(`Non-admin user ${userId} attempted admin:force-refresh`);
      return;
    }
    logger.info(`Admin ${userId} triggered force-refresh for all clients`);
    io.emit('force-refresh');
  });

  // Allow clients to refresh their access token on the socket connection
  authSocket.on('token:refresh', (token: string) => {
    if (token && typeof token === 'string') {
      authSocket.accessToken = token;
    }
  });

  // Register event handlers
  registerListHandlers(io, authSocket);
  registerNotificationHandlers(io, authSocket);
  registerProductHandlers(io, authSocket);

  // Error handling
  authSocket.on('error', (error) => {
    logger.error(`Socket error for user ${userId}:`, error);
    Sentry.captureException(error, {
      extra: { userId },
    });
    authSocket.emit('error', { message: 'An error occurred' });
  });

  authSocket.on('disconnect', (reason) => {
    logger.info(`User disconnected: ${userId} - ${reason}`);

    // Clean up rate limiter tracking
    clearRateLimit(authSocket.id);

    // Remove socket from global tracking
    const sockets = connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(authSocket.id);
      if (sockets.size === 0) {
        connectedUsers.delete(userId);
        // Notify admin presence subscribers that user went fully offline
        io.to('admin:presence').emit('admin:user-disconnected', { userId });
      }
    }
  });
});

// Initialize Redis for cross-server communication
initRedis(io);

// Start server
httpServer.listen(env.PORT, () => {
  logger.info(`Socket.io server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down socket server...');
  closeRedis();
  io.close(() => {
    logger.info('Socket server closed');
    process.exit(0);
  });
  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 5000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  Sentry.captureException(reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  Sentry.captureException(error);
  process.exit(1);
});

export { io };
