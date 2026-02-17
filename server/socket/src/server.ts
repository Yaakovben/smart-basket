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

// מעקב משתמשים מחוברים: userId → Set<socketId>
// תומך במספר חלונות/מכשירים לכל משתמש
const connectedUsers = new Map<string, Set<string>>();

// אתחול Sentry לניטור שגיאות
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    serverName: 'socket-server',
    enabled: env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
  });
  logger.info('Sentry error monitoring initialized for Socket server');
}

const httpServer = createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.io server');
});

// הגדרת CORS - תמיכה במספר origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

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

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket;
  const userId = authSocket.userId!;
  logger.info(`User connected: ${userId}`);

  // חדר אישי להתראות ישירות
  authSocket.join(`user:${userId}`);

  const isNewUser = !connectedUsers.has(userId);
  if (isNewUser) {
    connectedUsers.set(userId, new Set());
  }
  connectedUsers.get(userId)!.add(authSocket.id);

  // עדכון מנהל על משתמש חדש אונליין
  if (isNewUser) {
    io.to('admin:presence').emit('admin:user-connected', { userId });
  }

  // נוכחות אדמין: קבלת רשימת משתמשים מחוברים (אדמין בלבד)
  authSocket.on('get:online-users', () => {
    if (!env.ADMIN_EMAIL || authSocket.email?.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
      logger.warn(`Non-admin user ${userId} attempted get:online-users`);
      return;
    }
    authSocket.join('admin:presence');
    authSocket.emit('admin:online-users', {
      userIds: Array.from(connectedUsers.keys()),
    });
  });

  authSocket.on('leave:online-users', () => {
    authSocket.leave('admin:presence');
  });

  // רענון טוקן על חיבור קיים
  authSocket.on('token:refresh', (token: string) => {
    if (token && typeof token === 'string') {
      authSocket.accessToken = token;
    }
  });

  registerListHandlers(io, authSocket);
  registerNotificationHandlers(io, authSocket);
  registerProductHandlers(io, authSocket);

  authSocket.on('error', (error) => {
    logger.error(`Socket error for user ${userId}:`, error);
    Sentry.captureException(error, {
      extra: { userId },
    });
    authSocket.emit('error', { message: 'An error occurred' });
  });

  authSocket.on('disconnect', (reason) => {
    logger.info(`User disconnected: ${userId} - ${reason}`);

    clearRateLimit(authSocket.id);

    const sockets = connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(authSocket.id);
      if (sockets.size === 0) {
        connectedUsers.delete(userId);
        io.to('admin:presence').emit('admin:user-disconnected', { userId });
      }
    }
  });
});

initRedis(io);

httpServer.listen(env.PORT, () => {
  logger.info(`Socket.io server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// כיבוי מסודר
const shutdown = () => {
  logger.info('Shutting down socket server...');
  closeRedis();
  io.close(() => {
    logger.info('Socket server closed');
    process.exit(0);
  });
  // כיבוי כפוי אחרי timeout
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 5000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  Sentry.captureException(reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  Sentry.captureException(error);
  process.exit(1);
});

export { io };
