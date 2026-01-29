import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config';
import { authenticateSocket } from './middleware/auth.middleware';
import {
  registerListHandlers,
  registerNotificationHandlers,
  registerProductHandlers,
} from './handlers';
import { initRedis, closeRedis } from './services/redis.service';
import type { AuthenticatedSocket, ClientToServerEvents, ServerToClientEvents } from './types';

const httpServer = createServer();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
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
  console.log(`User connected: ${authSocket.userId}`);

  // Join user's personal room for direct notifications
  authSocket.join(`user:${authSocket.userId}`);

  // Register event handlers
  registerListHandlers(io, authSocket);
  registerNotificationHandlers(io, authSocket);
  registerProductHandlers(io, authSocket);

  // Error handling
  authSocket.on('error', (error) => {
    console.error(`Socket error for user ${authSocket.userId}:`, error);
    authSocket.emit('error', { message: 'An error occurred' });
  });

  authSocket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${authSocket.userId} - ${reason}`);
  });
});

// Initialize Redis for cross-server communication
initRedis(io);

// Start server
httpServer.listen(env.PORT, () => {
  console.log(`Socket.io server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down socket server...');
  closeRedis();
  io.close(() => {
    console.log('Socket server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { io };
