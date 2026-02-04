import webPush from 'web-push';
import { PushSubscription, type IPushSubscription } from '../models';
import { env } from '../config/environment';

// Initialize web-push with VAPID keys
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
  /**
   * Check if push notifications are configured
   */
  static isEnabled(): boolean {
    return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  }

  /**
   * Get public VAPID key for client subscription
   */
  static getPublicKey(): string | null {
    return env.VAPID_PUBLIC_KEY || null;
  }

  /**
   * Subscribe a user to push notifications
   */
  static async subscribe(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ): Promise<IPushSubscription> {
    // Remove existing subscription for this endpoint (in case of re-subscribe)
    await PushSubscription.deleteOne({ endpoint: subscription.endpoint });

    // Create new subscription
    const pushSub = new PushSubscription({
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });

    return pushSub.save();
  }

  /**
   * Unsubscribe a user from push notifications
   */
  static async unsubscribe(userId: string, endpoint?: string): Promise<void> {
    if (endpoint) {
      await PushSubscription.deleteOne({ userId, endpoint });
    } else {
      // Remove all subscriptions for this user
      await PushSubscription.deleteMany({ userId });
    }
  }

  /**
   * Send push notification to a specific user
   */
  static async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const subscriptions = await PushSubscription.find({ userId });

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
          JSON.stringify(payload)
        );
      } catch (error: unknown) {
        const pushError = error as { statusCode?: number };
        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    });

    await Promise.all(sendPromises);
  }

  /**
   * Send push notification to multiple users
   */
  static async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const sendPromises = userIds.map((userId) => this.sendToUser(userId, payload));
    await Promise.all(sendPromises);
  }

  /**
   * Check if user has any push subscriptions
   */
  static async hasSubscription(userId: string): Promise<boolean> {
    const count = await PushSubscription.countDocuments({ userId });
    return count > 0;
  }
}
