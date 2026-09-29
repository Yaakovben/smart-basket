/**
 * push.service.ts
 *
 * שליחת Web Push Notifications (VAPID).
 * אם env חסרים מפתחות VAPID - הפונקציות הופכות ל-no-op (isEnabled=false).
 *
 * מנויים שחוזרים 410/404 נמחקים אוטומטית ממסד הנתונים (endpoint פגה).
 */

import webPush from 'web-push';
import { PushSubscriptionDAL, DeviceTokenDAL } from '../dal';
import { User, type IDeviceToken } from '../models';
import { type WebPushDevice } from './pushDevice';
import { env } from '../config/environment';
import { logger } from '../config';
import { sendFcm, isFcmEnabled, type SendOutcome } from './nativePush/fcm.sender';
import { sendApns, isApnsEnabled } from './nativePush/apns.sender';
import type { NativePushMessage } from './nativePush/nativePushPayload';

// אתחול web-push עם מפתחות VAPID. אם חסרים - הלוגיקה בהמשך תדלג על שליחות.
// (VAPID_EMAIL תמיד קיים - ברירת מחדל ל-env, ראה environment.ts.)
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
function isEnabled(): boolean {
  return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

/** מחזיר את המפתח הציבורי לצד הלקוח (או null אם לא מוגדר). */
export function getPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY || null;
}

// ============== מנויים ==============

/**
 * הרשמת מכשיר למנוי Push מהאתר. מוחק מנוי קודם לאותו endpoint (רה-סאבסקרייב).
 * טלפון שכבר רשומה בו האפליקציה מהחנות מקבל התראות ממנה, ולכן מנוי מהאתר
 * באותו סוג טלפון לא נשמר: בלי זה משתמש שעבר ממסך הבית לאפליקציה, והשאיר
 * את שניהם, היה מקבל כל התראה פעמיים.
 */
export async function subscribe(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  device: WebPushDevice,
): Promise<void> {
  // מחיקת מנוי קיים לאותו endpoint (במקרה של הרשמה מחדש)
  await PushSubscriptionDAL.deleteByEndpoint(subscription.endpoint);
  if (device !== 'desktop' && await DeviceTokenDAL.existsForUserAndPlatform(userId, device)) return;
  await PushSubscriptionDAL.create({
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    device,
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

/** האם למשתמש יש מנוי Push פעיל (דפדפן או אפליקציה מהחנות). */
export async function hasSubscription(userId: string): Promise<boolean> {
  const [web, native] = await Promise.all([
    PushSubscriptionDAL.countByUserId(userId),
    DeviceTokenDAL.countByUserId(userId),
  ]);
  return web + native > 0;
}

// ============== מכשירים נייטיב (האפליקציות מהחנות) ==============

/** רישום טוקן התראות של מכשיר (אנדרואיד: FCM, iOS: APNs). */
export async function registerDevice(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
  await DeviceTokenDAL.upsert(userId, token, platform);
  // מעכשיו הטלפון מקבל התראות מהאפליקציה: מנויים מהאתר באותו סוג טלפון נמחקים,
  // כדי שלא תגיע כל התראה פעמיים. מחשב נשאר עם ההתראות שלו.
  await PushSubscriptionDAL.deleteByUserAndDevice(userId, platform);
}

/** ביטול טוקן של מכשיר (כיבוי התראות או יציאה מהחשבון). */
export async function unregisterDevice(userId: string, token: string): Promise<void> {
  await DeviceTokenDAL.deleteByUserAndToken(userId, token);
}

const toNativeMessage = (payload: PushPayload): NativePushMessage => ({
  title: payload.title,
  body: payload.body,
  url: payload.data?.url,
  data: { listId: payload.data?.listId, type: payload.data?.type, notificationId: payload.data?.notificationId },
});

// שליחה למכשיר נייטיב אחד, עם מחיקה של טוקן מת (אפליקציה שהוסרה וכו').
// שירות שלא הוגדר (בלי מפתחות) נחשב כישלון שקט, לא טוקן מת.
async function sendToDevice(device: IDeviceToken, msg: NativePushMessage): Promise<boolean> {
  const outcome: SendOutcome = device.platform === 'ios'
    ? (isApnsEnabled() ? await sendApns(device.token, msg) : 'error')
    : (isFcmEnabled() ? await sendFcm(device.token, msg) : 'error');
  if (outcome === 'dead') {
    try { await DeviceTokenDAL.deleteByToken(device.token); } catch (err) {
      logger.warn('Failed to delete dead device token: %s', (err as Error).message);
    }
  }
  return outcome === 'ok';
}

// ============== שליחה ==============

// פונקציית עזר: שליחת payload לרשומת מנוי בודדת, עם ניקוי אוטומטי של endpoint פג.
// מחזיר true/false בהצלחה טכנית (השרת של הדפדפן/פלטפורמת ה-push קיבל את
// הבקשה) - לא ערובה שהמכשיר בפועל הציג את ההתראה (web push הוא fire-and-
// forget, אין אישור מסירה אמיתי בפרוטוקול עצמו).
async function sendToSubscription(
  sub: { _id: { toString: () => string }; endpoint: string; keys: { p256dh: string; auth: string } },
  payloadStr: string
): Promise<boolean> {
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      payloadStr,
      { urgency: 'high', TTL: 60 * 60 } // שעה
    );
    return true;
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
    return false;
  }
}

export interface SendResult {
  // false = למשתמש אין אף מנוי push פעיל בכלל - לא בוצע שום ניסיון שליחה
  // (זה בדיוק המקרה של "לא דלוק לו התראות פוש" שהמנהל צריך לדעת עליו).
  hasSubscription: boolean;
  delivered: number;
  failed: number;
}

/** שליחת push לכל המכשירים של משתמש יחיד. מחזיר סטטוס מסירה מפורט. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  const [subscriptions, devices] = await Promise.all([
    PushSubscriptionDAL.findByUserId(userId),
    DeviceTokenDAL.findByUserId(userId),
  ]);
  if (subscriptions.length === 0 && devices.length === 0) return { hasSubscription: false, delivered: 0, failed: 0 };

  const payloadStr = JSON.stringify(payload);
  const msg = toNativeMessage(payload);
  const results = await Promise.all([
    ...subscriptions.map(sub => (isEnabled() ? sendToSubscription(sub, payloadStr) : Promise.resolve(false))),
    ...devices.map(d => sendToDevice(d, msg)),
  ]);
  const delivered = results.filter(Boolean).length;
  return { hasSubscription: true, delivered, failed: results.length - delivered };
}

/** שליחת push לכמה משתמשים במקביל, לכל המכשירים (דפדפן ואפליקציה). */
export async function sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return;

  const [subscriptions, devices] = await Promise.all([
    isEnabled() ? PushSubscriptionDAL.findByUserIds(userIds) : Promise.resolve([]),
    DeviceTokenDAL.findByUserIds(userIds),
  ]);
  if (subscriptions.length === 0 && devices.length === 0) return;

  const payloadStr = JSON.stringify(payload);
  const msg = toNativeMessage(payload);
  await Promise.all([
    ...subscriptions.map(sub => sendToSubscription(sub, payloadStr)),
    ...devices.map(d => sendToDevice(d, msg)),
  ]);
}

export interface UserDeliveryStatus {
  userId: string;
  name: string;
  // no_subscription = לא הפעיל/ה push בכלל, לא בוצע שום ניסיון שליחה.
  status: 'delivered' | 'failed' | 'no_subscription';
  delivered: number;
  failed: number;
}

export interface BroadcastResult {
  totalUsers: number;
  usersWithPush: number;
  usersWithoutPush: number;
  delivered: number;
  failed: number;
  // פירוט מלא למי נשלח ולמי לא - למסך המנהל, ממוין: קודם מי שנכשל/אין לו
  // מנוי (הכי רלוונטי לבדוק), אחר-כך מי שקיבל בהצלחה.
  perUser: UserDeliveryStatus[];
}

/**
 * שליחת push לכל המנויים הרשומים במערכת (broadcast גלובלי - הודעות מנהל בלבד).
 * מחזיר פירוט מסירה מלא כולל רשימה per-user - מי קיבל, מי נכשל, ומי בכלל
 * לא הפעיל push (לא ניתן היה לשלוח אליו כלל).
 */
export async function sendToAll(payload: PushPayload): Promise<BroadcastResult> {
  const [users, subscriptions, devices] = await Promise.all([
    User.find({}, 'name').lean(),
    PushSubscriptionDAL.find({}),
    DeviceTokenDAL.findAll(),
  ]);

  const subsByUser = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    const key = sub.userId.toString();
    const userSubs = subsByUser.get(key);
    if (userSubs) userSubs.push(sub); else subsByUser.set(key, [sub]);
  }
  const devicesByUser = new Map<string, IDeviceToken[]>();
  for (const d of devices) {
    const key = d.userId.toString();
    const list = devicesByUser.get(key);
    if (list) list.push(d); else devicesByUser.set(key, [d]);
  }

  const payloadStr = isEnabled() ? JSON.stringify(payload) : null;
  const msg = toNativeMessage(payload);

  const perUser: UserDeliveryStatus[] = await Promise.all(users.map(async (u): Promise<UserDeliveryStatus> => {
    const userId = u._id.toString();
    const subs = subsByUser.get(userId) || [];
    const userDevices = devicesByUser.get(userId) || [];
    if (subs.length === 0 && userDevices.length === 0) {
      return { userId, name: u.name, status: 'no_subscription', delivered: 0, failed: 0 };
    }
    const results = await Promise.all([
      ...subs.map(sub => (payloadStr ? sendToSubscription(sub, payloadStr) : Promise.resolve(false))),
      ...userDevices.map(d => sendToDevice(d, msg)),
    ]);
    const delivered = results.filter(Boolean).length;
    return { userId, name: u.name, status: delivered > 0 ? 'delivered' : 'failed', delivered, failed: results.length - delivered };
  }));

  perUser.sort((a, b) => {
    const rank = { no_subscription: 0, failed: 1, delivered: 2 };
    return rank[a.status] - rank[b.status];
  });

  const usersWithPush = perUser.filter(p => p.status !== 'no_subscription').length;

  return {
    totalUsers: users.length,
    usersWithPush,
    usersWithoutPush: users.length - usersWithPush,
    delivered: perUser.reduce((s, p) => s + p.delivered, 0),
    failed: perUser.reduce((s, p) => s + p.failed, 0),
    perUser,
  };
}
