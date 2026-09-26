import axios from 'axios';
import mongoose from 'mongoose';
import { env } from '../config/environment';
import { logger } from '../config';
import { UserDAL } from '../dal';
import { AppError } from '../errors';
import { sendToUser } from './push.service';

// ===== מנוי דרך חנויות האפליקציות (App Store / Google Play) =====
// בתוך האפליקציה הנייטיב אפל וגוגל מחייבות רכישה דרך מערכת התשלום שלהן.
// את הרכישה עצמה מנהל RevenueCat (אימות קבלות, חידושים, ביטולים, החזרים)
// מול שתי החנויות. השרת לא סומך על מה שהלקוח מדווח: בכל אירוע הוא שואל
// את RevenueCat ישירות מה מצב ההרשאה של המשתמש, ומעדכן לפי זה בלבד.
// מזהה המשתמש ב-RevenueCat הוא מזהה המשתמש שלנו (appUserID), כך שאין צורך
// בטבלת מיפוי.

const PUSH_ICON = '/icon-192x192.png';
const RC_API = 'https://api.revenuecat.com/v1';

export function isStoreBillingConfigured(): boolean {
  return !!env.REVENUECAT_SECRET_KEY;
}

interface RcEntitlement {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
}

interface RcSubscription {
  expires_date: string | null;
  unsubscribe_detected_at: string | null;
  billing_issues_detected_at: string | null;
  store: string;
}

interface RcSubscriber {
  entitlements: Record<string, RcEntitlement>;
  subscriptions: Record<string, RcSubscription>;
}

async function fetchSubscriber(appUserId: string): Promise<RcSubscriber> {
  const res = await axios.get<{ subscriber: RcSubscriber }>(
    `${RC_API}/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` }, timeout: 15000 },
  );
  return res.data.subscriber;
}

export interface StoreSyncResult {
  active: boolean;
  expiresAt: Date | null;
  changed: boolean;
}

/**
 * מסנכרן את מצב המנוי של משתמש מ-RevenueCat אל מסמך המשתמש.
 * כללים:
 *  - מנוי קבוע (Pro בלי תפוגה, שהוענק ידנית) לא נוגעים בו לעולם.
 *  - הרשאה פעילה בחנות: Pro עד תאריך התפוגה בחנות, והמקור עובר לחנות. אם
 *    יש כבר Pro פעיל עם תאריך מאוחר יותר (ניסיון/תשלום ידני), שומרים עליו.
 *  - הרשאה שפגה: משנים רק משתמש שה-Pro שלו הגיע מהחנות, כדי לא לפגוע
 *    בחודשי מתנה או בתשלום ידני.
 */
export async function syncStoreSubscription(userId: string, notify = false): Promise<StoreSyncResult> {
  if (!isStoreBillingConfigured()) {
    throw new AppError('Store billing is not configured', 503, 'STORE_BILLING_UNAVAILABLE');
  }
  if (!mongoose.isValidObjectId(userId)) {
    // מזהים אנונימיים של RevenueCat ($RCAnonymousID) לא שייכים לאף משתמש אצלנו
    return { active: false, expiresAt: null, changed: false };
  }

  const user = await UserDAL.findById(userId);
  if (!user) return { active: false, expiresAt: null, changed: false };

  const subscriber = await fetchSubscriber(userId);
  const ent = subscriber.entitlements?.[env.REVENUECAT_ENTITLEMENT_ID];
  const now = new Date();

  // תקופת חסד (בעיית חיוב) נחשבת פעילה, כמו שהחנות עצמה מתייחסת אליה.
  const rawExpiry = ent?.grace_period_expires_date || ent?.expires_date || null;
  const storeExpiry = rawExpiry ? new Date(rawExpiry) : null;
  const active = !!ent && (!storeExpiry || storeExpiry > now);
  const sub = ent ? subscriber.subscriptions?.[ent.product_identifier] : undefined;
  const willRenew = !!sub && !sub.unsubscribe_detected_at;

  const isPermanentPro = user.plan === 'pro' && !user.planExpiresAt;
  if (isPermanentPro) return { active, expiresAt: storeExpiry, changed: false };

  const wasPro = user.plan === 'pro' && !!user.planExpiresAt && user.planExpiresAt > now;
  let update: Record<string, unknown> | null = null;

  if (active) {
    // רכישה לכל החיים (בלי תפוגה) בחנות
    if (!storeExpiry) {
      update = { plan: 'pro', planExpiresAt: null, planAutoRenew: false, planSource: 'store' };
    } else {
      // מי שקנה בזמן חודשי מתנה או תשלום ידני לא מאבד ימים: התאריך המאוחר מבין השניים.
      const keepLater = wasPro && user.planSource !== 'store' && user.planExpiresAt! > storeExpiry;
      update = {
        plan: 'pro',
        planExpiresAt: keepLater ? user.planExpiresAt : storeExpiry,
        planAutoRenew: willRenew,
        planSource: 'store',
      };
    }
  } else if (user.planSource === 'store') {
    // פג או הוחזר כסף. isPro כבר מתייחס לתאריך שעבר כחינמי; מעדכנים את התאריך
    // לערך מהחנות (בהחזר כספי הוא מוקדם מהמקורי) ומכבים חידוש.
    update = { planExpiresAt: storeExpiry && storeExpiry < now ? storeExpiry : now, planAutoRenew: false };
  }

  if (!update) return { active, expiresAt: storeExpiry, changed: false };

  await UserDAL.updateById(userId, update as Parameters<typeof UserDAL.updateById>[1]);

  if (notify && active && !wasPro) {
    void sendToUser(userId, {
      title: '✦ המנוי שלך הופעל!',
      body: 'תודה שהצטרפת ל-Pro. הכל פתוח עכשיו, ללא הגבלה.',
      icon: PUSH_ICON,
      badge: PUSH_ICON,
      data: { url: '/subscription', type: 'subscription' },
    }).catch(() => { /* push הוא בונוס */ });
  }

  return { active, expiresAt: storeExpiry, changed: true };
}

interface RcWebhookEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_to?: string[];
  transferred_from?: string[];
}

/**
 * טיפול באירוע webhook של RevenueCat. לא סומכים על תוכן האירוע עצמו: לוקחים
 * ממנו רק את מזהי המשתמשים הרלוונטיים ומסנכרנים כל אחד מהם מול ה-API.
 */
export async function handleStoreWebhook(event: RcWebhookEvent): Promise<void> {
  if (event.type === 'TEST') return;

  const ids = new Set<string>(
    [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
      ...(event.transferred_to ?? []),
      ...(event.transferred_from ?? []),
    ].filter((id): id is string => !!id && mongoose.isValidObjectId(id)),
  );

  const notify = event.type === 'INITIAL_PURCHASE' || event.type === 'UNCANCELLATION';
  for (const id of ids) {
    try {
      await syncStoreSubscription(id, notify);
    } catch (err) {
      logger.warn('store webhook sync failed for %s: %s', id, (err as Error).message);
      throw err; // RevenueCat ינסה שוב כשמחזירים שגיאה
    }
  }
}
