import { env } from '../config/environment';
import { logger } from '../config';
import { SubscriptionRequest, User, type ISubscriptionRequest, type SubscriptionRequestStatus } from '../models';
import { UserDAL } from '../dal';
import { ConflictError, NotFoundError } from '../errors';
import { sendToUser, sendToUsers } from './push.service';

// אותו אייקון בפוש כמו כל שאר ההתראות באפליקציה (notification.service.ts) -
// בלעדיו הפוש מציג אייקון דפדפן גנרי במקום לוגו Smart Basket.
const PUSH_ICON = '/icon-192x192.png';

// ===== תשלום =====
// Pro נרכש רק דרך App Store / Google Play (ראו storeSubscription.service).
// מסלול התשלום הידני (ביט, PayBox, העברה ואישור אדמין) הוסר. מה שנשאר כאן
// מהמסלול הישן הוא רק הטיפול בבקשות שכבר דווחו כשולמו לפני ההסרה, כדי שאף
// אחד שכבר שילם לא יישאר בלי מנוי.
const OPEN_STATUSES: SubscriptionRequestStatus[] = ['pending', 'reported'];

// ===== צד אדמין =====

export async function listAdminRequests(statuses: SubscriptionRequestStatus[], limit = 100) {
  return SubscriptionRequest.find({ status: { $in: statuses } })
    .sort({ reportedAt: -1, createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email plan planExpiresAt');
}

/** שדות Pro במתנה למשתמש חדש (ריק אם TRIAL_MONTHS=0). */
export function newUserTrialFields(): { plan: 'pro'; planExpiresAt: Date; planAutoRenew: false; planSource: 'trial' } | Record<string, never> {
  if (!env.TRIAL_MONTHS) return {};
  return { plan: 'pro', planExpiresAt: addMonths(new Date(), env.TRIAL_MONTHS), planAutoRenew: false, planSource: 'trial' };
}

// ===== מענק Pro חד-פעמי למשתמשים ותיקים (backfill) =====
// כל משתמש שנרשם *לפני* שהמתנה הופעלה מקבל אותה פעם אחת, מהיום, באותו
// אורך כמו TRIAL_MONTHS. לא נוגעים במשתמש שכבר Pro באופן שווה-או-טוב-יותר
// (מנוי קבוע, או מנוי בתוקף עד אחרי תאריך היעד) - לא מקצרים אף מנוי בתשלום.
// legacyTrialGrantedAt מסמן שהמשתמש כבר "טופל" (גם אם דולג עליו) - הרצה
// חוזרת של הפונקציה לא תיגע בו שוב.
function legacySkipFilter(targetExpiry: Date) {
  return {
    plan: 'pro',
    $or: [
      { planExpiresAt: { $exists: false } },
      { planExpiresAt: null },
      { planExpiresAt: { $gt: targetExpiry } },
    ],
  };
}

export async function countLegacyTrialEligible(): Promise<number> {
  if (!env.TRIAL_MONTHS) return 0;
  const targetExpiry = addMonths(new Date(), env.TRIAL_MONTHS);
  return User.countDocuments({
    legacyTrialGrantedAt: { $exists: false },
    $nor: [legacySkipFilter(targetExpiry)],
  });
}

export interface LegacyTrialResult { granted: number; skipped: number }

export async function grantLegacyTrialToExistingUsers(): Promise<LegacyTrialResult> {
  if (!env.TRIAL_MONTHS) return { granted: 0, skipped: 0 };
  const now = new Date();
  const targetExpiry = addMonths(now, env.TRIAL_MONTHS);
  const skipFilter = legacySkipFilter(targetExpiry);
  const grantFilter = { legacyTrialGrantedAt: { $exists: false }, $nor: [skipFilter] };

  // מזהי המקבלים *לפני* העדכון - כדי שאחריו אפשר יהיה להודיע להם בפוש
  // (ה-updateMany עצמו לא מחזיר אילו מסמכים בדיוק הוא נגע בהם).
  const grantedIds = (await User.find(grantFilter).select('_id').lean()).map((u) => String(u._id));

  const skipped = await User.updateMany(
    { legacyTrialGrantedAt: { $exists: false }, ...skipFilter },
    { $set: { legacyTrialGrantedAt: now } },
  );
  const granted = await User.updateMany(
    { _id: { $in: grantedIds } },
    { $set: { plan: 'pro', planExpiresAt: targetExpiry, planAutoRenew: false, planSource: 'trial', legacyTrialGrantedAt: now } },
  );

  if (grantedIds.length > 0) {
    void sendToUsers(grantedIds, {
      title: `🎁 קיבלת ${env.TRIAL_MONTHS} חודשי Pro במתנה!`,
      body: 'הכל פתוח עכשיו ללא הגבלה - רשימות, קבוצות, עוזר AI והשוואות מחיר.',
      icon: PUSH_ICON,
      badge: PUSH_ICON,
      data: { url: '/subscription', type: 'subscription' },
    }).catch((e) => logger.warn('legacy trial grant push failed: %s', (e as Error).message));
  }

  return { granted: granted.modifiedCount, skipped: skipped.modifiedCount };
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/** אישור בקשה: הארכת המנוי מתאריך התפוגה הנוכחי (אם עוד בתוקף) או מעכשיו. */
export async function approveRequest(adminId: string, requestId: string, note?: string): Promise<ISubscriptionRequest> {
  // מעבר סטטוס אטומי - מונע אישור כפול (הארכה פעמיים) בלחיצה כפולה/שני אדמינים.
  const req = await SubscriptionRequest.findOneAndUpdate(
    { _id: requestId, status: { $in: OPEN_STATUSES } },
    { status: 'approved', resolvedAt: new Date(), resolvedBy: adminId, ...(note ? { adminNote: note } : {}) },
    { new: true },
  );
  if (!req) throw new ConflictError('Request not found or already handled', 'REQUEST_NOT_OPEN');

  const userId = String(req.userId);
  const user = await UserDAL.findById(userId);
  if (!user) throw NotFoundError.user();

  const isPermanentPro = user.plan === 'pro' && !user.planExpiresAt;
  if (!isPermanentPro) {
    const now = new Date();
    const stillActive = user.plan === 'pro' && user.planExpiresAt && user.planExpiresAt > now;
    const base = stillActive ? user.planExpiresAt! : now;
    await UserDAL.updateById(userId, {
      plan: 'pro',
      planExpiresAt: addMonths(base, req.months),
      planAutoRenew: false,
      planSource: 'paid',
    } as Partial<typeof user>);
  }

  void sendToUser(userId, {
    title: '✦ המנוי שלך הופעל!',
    body: 'תודה שהצטרפת ל-Pro. הכל פתוח עכשיו, ללא הגבלה.',
    icon: PUSH_ICON,
    badge: PUSH_ICON,
    data: { url: '/subscription', type: 'subscription' },
  }).catch(() => { /* push הוא בונוס */ });

  return req;
}

export async function rejectRequest(adminId: string, requestId: string, note?: string): Promise<ISubscriptionRequest> {
  const req = await SubscriptionRequest.findOneAndUpdate(
    { _id: requestId, status: { $in: OPEN_STATUSES } },
    { status: 'rejected', resolvedAt: new Date(), resolvedBy: adminId, ...(note ? { adminNote: note } : {}) },
    { new: true },
  );
  if (!req) throw new ConflictError('Request not found or already handled', 'REQUEST_NOT_OPEN');

  void sendToUser(String(req.userId), {
    title: 'לא הצלחנו לאמת את התשלום',
    body: note || 'לא מצאנו את ההעברה. אפשר לפתוח את עמוד המנוי ולנסות שוב או ליצור קשר.',
    icon: PUSH_ICON,
    badge: PUSH_ICON,
    data: { url: '/subscription', type: 'subscription' },
  }).catch(() => { /* push הוא בונוס */ });

  return req;
}
