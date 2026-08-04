/**
 * redisPublisher.service.ts
 *
 * מפרסם אירועים ל-Redis שנקלטים ע"י שרת ה-Socket (server/socket/src/services/redis.service.ts).
 * אופציונלי לגמרי - אם REDIS_URL לא מוגדר, כל הפונקציות הן no-op ואין השפעה
 * על שרת ה-API עצמו (single-instance mode: פשוט אין ניתוק/הוצאה בזמן אמת
 * של sockets פעילים כשמשתמש נמחק או מוסר מקבוצה - זה מתעדכן בכל מקרה
 * בפעם הבאה שהלקוח פונה ל-REST/מתחבר מחדש).
 */
import Redis from 'ioredis';
import { env } from '../config';
import { logger } from '../config/logger';

const CHANNEL = 'smart-basket:events';

let publisher: Redis | null = null;

function getPublisher(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!publisher) {
    publisher = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 1 });
    publisher.on('error', (err) => logger.error('[redis-publisher] connection error:', err));
  }
  return publisher;
}

interface RedisEvent {
  type: 'user:deleted' | 'member:kicked';
  listId: string;
  userId: string;
  userName: string;
  data: unknown;
}

async function publish(event: RedisEvent): Promise<void> {
  const client = getPublisher();
  if (!client) return; // אין Redis מוגדר - single-instance mode, no-op
  try {
    await client.publish(CHANNEL, JSON.stringify(event));
  } catch (err) {
    // אף פעם לא זורק - כשל בפרסום ל-Redis לא אמור להפיל פעולה עסקית
    // (מחיקת משתמש/הסרת חבר) שכבר הצליחה ב-DB.
    logger.error('[redis-publisher] publish failed:', err);
  }
}

/** מנתק בכפייה את כל ה-sockets של משתמש שנמחק (admin delete / self delete). */
export async function publishUserDeleted(userId: string): Promise<void> {
  await publish({ type: 'user:deleted', listId: '', userId, userName: '', data: null });
}

/** מוציא בכפייה משתמש שהוסר מקבוצה מחדר ה-socket של הרשימה - מונע גישה חיה בזמן אמת אחרי הסרה. */
export async function publishMemberKicked(listId: string, userId: string): Promise<void> {
  await publish({ type: 'member:kicked', listId, userId, userName: '', data: null });
}

export const closeRedisPublisher = (): void => {
  publisher?.disconnect();
  publisher = null;
};
