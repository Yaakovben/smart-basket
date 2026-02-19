import webPush from 'web-push';
import { PushSubscriptionDAL } from '../dal';
import { env } from '../config/environment';
import { logger } from '../config';

// אתחול web-push עם מפתחות VAPID
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    env.VAPID_EMAIL,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    listId?: string;
    type?: string;
  };
}

export class PushService {
  static isEnabled(): boolean {
    return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  }

  static getPublicKey(): string | null {
    return env.VAPID_PUBLIC_KEY || null;
  }

  static async subscribe(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ): Promise<void> {
    // מחיקת מנוי קיים לאותו endpoint (במקרה של הרשמה מחדש)
    await PushSubscriptionDAL.deleteByEndpoint(subscription.endpoint);

    await PushSubscriptionDAL.create({
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    } as Record<string, unknown>);
  }

  static async unsubscribe(userId: string, endpoint?: string): Promise<void> {
    if (endpoint) {
      await PushSubscriptionDAL.deleteByUserAndEndpoint(userId, endpoint);
    } else {
      // מחיקת כל המנויים של המשתמש
      await PushSubscriptionDAL.deleteByUserId(userId);
    }
  }

  static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const subscriptions = await PushSubscriptionDAL.findByUserId(userId);

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          JSON.stringify(payload),
          {
            urgency: 'high',
            TTL: 60 * 60, // שעה
          }
        );
      } catch (error: unknown) {
        const pushError = error as { statusCode?: number };
        // מחיקת מנוי לא תקין (410/404)
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          try {
            await PushSubscriptionDAL.deleteById(sub._id.toString());
          } catch (deleteError) {
            logger.warn('Failed to delete invalid push subscription %s: %s', sub.endpoint, (deleteError as Error).message);
          }
        } else {
          logger.warn('Push notification failed for endpoint %s: %s', sub.endpoint, (error as Error).message);
        }
      }
    });

    await Promise.all(sendPromises);
  }

  static async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const sendPromises = userIds.map((userId) => this.sendToUser(userId, payload));
    await Promise.all(sendPromises);
  }

  static async hasSubscription(userId: string): Promise<boolean> {
    const count = await PushSubscriptionDAL.countByUserId(userId);
    return count > 0;
  }
}
