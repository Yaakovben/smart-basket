/**
 * push.service.ts
 *
 * שליחת Web Push Notifications (VAPID).
 * אם env חסרים מפתחות VAPID - הפונקציות הופכות ל-no-op (isEnabled=false).
 *
 * מנויים שחוזרים 410/404 נמחקים אוטומטית ממסד הנתונים (endpoint פגה).
 */

import webPush from 'web-push';
import { PushSubscriptionDAL } from '../dal';
import { env } from '../config/environment';
import { logger } from '../config';

// אתחול web-push עם מפתחות VAPID. אם חסרים - הלוגיקה בהמשך תדלג על שליחות.
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(env.VAPID_EMAIL, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
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
    notificationId?: string;
  };
}

// ============== הגדרות ==============

/** האם Push מופעל כלל (יש מפתחות VAPID). */
export function isEnabled(): boolean {
  return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

/** מחזיר את המפתח הציבורי לצד הלקוח (או null אם לא מוגדר). */
export function getPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY || null;
}

// ============== מנויים ==============

/** הרשמת מכשיר למנוי Push. מוחק מנוי קודם לאותו endpoint (רה-סאבסקרייב). */
export async function subscribe(
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

/** ביטול מנוי. עם endpoint - רק את זה. בלי endpoint - את כל המכשירים של המשתמש. */
export async function unsubscribe(userId: string, endpoint?: string): Promise<void> {
  if (endpoint) {
    await PushSubscriptionDAL.deleteByUserAndEndpoint(userId, endpoint);
  } else {
    await PushSubscriptionDAL.deleteByUserId(userId);
  }
}

/** האם למשתמש יש מנוי Push פעיל. */
export async function hasSubscription(userId: string): Promise<boolean> {
  const count = await PushSubscriptionDAL.countByUserId(userId);
  return count > 0;
}

// ============== שליחה ==============

// פונקציית עזר: שליחת payload לרשומת מנוי בודדת, עם ניקוי אוטומטי של endpoint פג.
async function sendToSubscription(
  sub: { _id: { toString: () => string }; endpoint: string; keys: { p256dh: string; auth: string } },
  payloadStr: string
): Promise<void> {
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      payloadStr,
      { urgency: 'high', TTL: 60 * 60 } // שעה
    );
  } catch (error: unknown) {
    const pushError = error as { statusCode?: number };
    // 410/404 = endpoint לא קיים יותר. מוחקים את המנוי.
    if (pushError.statusCode === 410 || pushError.statusCode === 404) {
      try { await PushSubscriptionDAL.deleteById(sub._id.toString()); } catch (deleteError) {
        logger.warn('Failed to delete invalid push subscription %s: %s', sub.endpoint, (deleteError as Error).message);
      }
    } else {
      logger.warn('Push notification failed for endpoint %s: %s', sub.endpoint, (error as Error).message);
    }
  }
}

/** שליחת push לכל המכשירים של משתמש יחיד. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isEnabled()) return;

  const subscriptions = await PushSubscriptionDAL.findByUserId(userId);
  const payloadStr = JSON.stringify(payload);
  await Promise.all(subscriptions.map(sub => sendToSubscription(sub, payloadStr)));
}

/** שליחת push לכמה משתמשים במקביל (שאילתה אחת למנויים + שליחה מקבילה). */
export async function sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!isEnabled() || userIds.length === 0) return;

  const subscriptions = await PushSubscriptionDAL.findByUserIds(userIds);
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);
  await Promise.all(subscriptions.map(sub => sendToSubscription(sub, payloadStr)));
}
