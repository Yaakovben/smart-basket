import Redis from 'ioredis';
import * as Sentry from '@sentry/node';
import type { Server } from 'socket.io';
import { env, logger } from '../config';
import type { ClientToServerEvents, ServerToClientEvents, NotificationData } from '../types';
import { broadcastProductAdded, broadcastProductToggled, broadcastProductDeleted } from '../handlers';

let subscriber: Redis | null = null;
let isRedisHealthy = false;

export const getRedisHealth = (): boolean => isRedisHealthy;

interface RedisEvent {
  type: 'product:added' | 'product:toggled' | 'product:deleted' | 'notification' | 'user:deleted';
  listId: string;
  userId: string;
  userName: string;
  data: unknown;
}

export const initRedis = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
  if (!env.REDIS_URL) {
    logger.info('Redis URL not configured - running without Redis');
    return;
  }

  try {
    subscriber = new Redis(env.REDIS_URL);

    subscriber.subscribe('smart-basket:events', (err) => {
      if (err) {
        logger.error('Failed to subscribe to Redis channel:', err);
        return;
      }
      isRedisHealthy = true;
      logger.info('Subscribed to Redis channel: smart-basket:events');
    });

    subscriber.on('message', (channel, message) => {
      if (channel !== 'smart-basket:events') return;

      try {
        const event: RedisEvent = JSON.parse(message);
        handleRedisEvent(io, event);
      } catch (error) {
        logger.error('Failed to parse Redis message:', error);
      }
    });

    subscriber.on('error', (err) => {
      isRedisHealthy = false;
      logger.error('Redis subscriber error:', err);
      Sentry.captureException(err, { tags: { service: 'redis' } });
    });

    subscriber.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    subscriber.on('connect', () => {
      isRedisHealthy = true;
      logger.info('Redis reconnected');
    });

    subscriber.on('close', () => {
      isRedisHealthy = false;
      logger.warn('Redis connection closed');
    });

    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
  }
};

const handleRedisEvent = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  event: RedisEvent
) => {
  const { type, listId, userId, userName, data } = event;

  switch (type) {
    case 'product:added':
      broadcastProductAdded(
        io,
        listId,
        data as { id: string; name: string; quantity: number; unit: string; category: string },
        userId,
        userName
      );
      break;

    case 'product:toggled': {
      const toggleData = data as { productId: string; isPurchased: boolean };
      broadcastProductToggled(io, listId, toggleData.productId, toggleData.isPurchased, userId, userName);
      break;
    }

    case 'product:deleted': {
      const deleteData = data as { productId: string };
      broadcastProductDeleted(io, listId, deleteData.productId, userId, userName);
      break;
    }

    case 'notification':
      io.to(`list:${listId}`).emit('notification:new', data as NotificationData);
      break;

    case 'user:deleted': {
      // ניתוק כפוי של כל ה-sockets של המשתמש שנמחק
      const room = `user:${userId}`;
      io.in(room).disconnectSockets(true);
      break;
    }
  }
};

export const closeRedis = () => {
  subscriber?.disconnect();
};
