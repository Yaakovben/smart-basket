import { logger } from '../config';

/**
 * Simple in-memory rate limiter for socket events.
 * Tracks event counts per socket and resets on a sliding window.
 */
const socketEventCounts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 10_000; // 10 seconds
const MAX_EVENTS = 50; // max events per window per socket

export const checkRateLimit = (socketId: string): boolean => {
  const now = Date.now();
  const entry = socketEventCounts.get(socketId);

  if (!entry || now > entry.resetAt) {
    socketEventCounts.set(socketId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  entry.count++;
  if (entry.count > MAX_EVENTS) {
    logger.warn(`Rate limit exceeded for socket ${socketId}`);
    return false;
  }

  return true;
};

export const clearRateLimit = (socketId: string): void => {
  socketEventCounts.delete(socketId);
};

// Periodic cleanup of expired entries to prevent memory accumulation
// from sockets that disconnected without proper cleanup
setInterval(() => {
  const now = Date.now();
  for (const [socketId, entry] of socketEventCounts.entries()) {
    if (now > entry.resetAt) {
      socketEventCounts.delete(socketId);
    }
  }
}, 5 * 60 * 1000).unref(); // Every 5 minutes, .unref() so it doesn't block shutdown
