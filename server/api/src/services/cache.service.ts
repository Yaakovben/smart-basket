import Redis from 'ioredis';
import { env, logger } from '../config';

// Redis client singleton
let redis: Redis | null = null;

// Cache TTL defaults (in seconds)
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
} as const;

// Cache key prefixes for organization
export const CachePrefix = {
  USER_LISTS: 'user:lists:',
  LIST: 'list:',
  USER_PROFILE: 'user:profile:',
  NOTIFICATIONS_COUNT: 'notifications:count:',
} as const;

/**
 * Initialize Redis connection
 */
export function initRedis(): void {
  if (!env.REDIS_URL) {
    logger.info('Redis URL not configured - caching disabled');
    return;
  }

  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    redis = null;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Cache service for storing and retrieving cached data
 */
export class CacheService {
  /**
   * Check if Redis is available
   */
  static isAvailable(): boolean {
    return redis !== null && redis.status === 'ready';
  }

  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;

    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  static async set<T>(key: string, value: T, ttlSeconds: number = CacheTTL.MEDIUM): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  static async del(key: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  static async delPattern(pattern: string): Promise<void> {
    if (!redis) return;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  // ==================== Convenience Methods ====================

  /**
   * Get or set pattern - fetches from cache or executes function and caches result
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = CacheTTL.MEDIUM
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Cache the result (don't await to not block)
    this.set(key, data, ttlSeconds).catch(() => {});

    return data;
  }

  /**
   * Invalidate user's list cache
   */
  static async invalidateUserLists(userId: string): Promise<void> {
    await this.del(`${CachePrefix.USER_LISTS}${userId}`);
  }

  /**
   * Invalidate specific list cache
   */
  static async invalidateList(listId: string): Promise<void> {
    await this.del(`${CachePrefix.LIST}${listId}`);
  }

  /**
   * Invalidate all caches related to a list (list itself + all members' list caches)
   */
  static async invalidateListAndMembers(listId: string, memberIds: string[]): Promise<void> {
    const keys = [
      `${CachePrefix.LIST}${listId}`,
      ...memberIds.map(id => `${CachePrefix.USER_LISTS}${id}`),
    ];

    if (!redis || keys.length === 0) return;

    try {
      await redis.del(...keys);
    } catch (error) {
      logger.error('Cache invalidate list and members error:', error);
    }
  }

  /**
   * Invalidate user profile cache
   */
  static async invalidateUserProfile(userId: string): Promise<void> {
    await this.del(`${CachePrefix.USER_PROFILE}${userId}`);
  }

  /**
   * Invalidate notifications count cache
   */
  static async invalidateNotificationsCount(userId: string): Promise<void> {
    await this.del(`${CachePrefix.NOTIFICATIONS_COUNT}${userId}`);
  }
}
