import { logger } from '../config';

/** מגביל קצב פשוט בזיכרון לאירועי socket. חלון הזזה לכל socket. */
const socketEventCounts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 10_000; // 10 שניות
const MAX_EVENTS = 50; // מקסימום אירועים לחלון לכל socket

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

// ניקוי תקופתי של רשומות שפג תוקפן - מונע הצטברות זיכרון מ-sockets שנותקו
setInterval(() => {
  const now = Date.now();
  for (const [socketId, entry] of socketEventCounts.entries()) {
    if (now > entry.resetAt) {
      socketEventCounts.delete(socketId);
    }
  }
}, 5 * 60 * 1000).unref(); // כל 5 דקות, .unref() כדי לא לחסום כיבוי
