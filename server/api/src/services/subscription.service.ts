import crypto from 'crypto';
import mongoose from 'mongoose';
import { env } from '../config/environment';
import { logger } from '../config';
import { SubscriptionRequest, User, type ISubscriptionRequest, type SubscriptionPayMethod, type SubscriptionRequestStatus } from '../models';
import { UserDAL } from '../dal';
import { ConflictError, NotFoundError, ValidationError, AppError } from '../errors';
import { sendToUser, sendToUsers } from './push.service';
import { sendAdminNotice } from './email.service';

// ===== מחירים ושיטות תשלום =====
// כל הערכים מגיעים ממשתני סביבה. לא ממציאים מחיר שנתי/פרטי תשלום: אם משהו לא
// הוגדר הוא פשוט לא מוצע ללקוח.

export const ALLOWED_MONTHS = [1, 3, 12] as const;
const OPEN_STATUSES: SubscriptionRequestStatus[] = ['pending', 'reported'];
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // בלי תווים מבלבלים (0/O, 1/I)

const round2 = (n: number) => Math.round(n * 100) / 100;

export function priceForMonths(months: number): number {
  if (months === 12 && env.PRO_PRICE_YEARLY) return round2(env.PRO_PRICE_YEARLY);
  return round2(env.PRO_PRICE_MONTHLY * months);
}

export interface PaymentMethodsConfig {
  bit: { url: string } | null;
  paybox: { url: string } | null;
  bank: { bankName: string; branch: string; account: string } | null;
}

export function getPaymentMethods(): PaymentMethodsConfig {
  // ביט זמין רק עם קישור תשלום: לא חושפים מספר טלפון או שם מקבל ללקוחות.
  const bit = env.BIT_PAYMENT_URL ? { url: env.BIT_PAYMENT_URL } : null;
  const paybox = env.PAYBOX_PAYMENT_URL ? { url: env.PAYBOX_PAYMENT_URL } : null;
  const bank = env.BANK_NAME && env.BANK_BRANCH && env.BANK_ACCOUNT
    ? { bankName: env.BANK_NAME, branch: env.BANK_BRANCH, account: env.BANK_ACCOUNT }
    : null;
  return { bit, paybox, bank };
}

export function getPlansCatalog() {
  const yearly = env.PRO_PRICE_YEARLY ? round2(env.PRO_PRICE_YEARLY) : null;
  const monthly = round2(env.PRO_PRICE_MONTHLY);
  return {
    currency: 'ILS',
    monthly,
    // אחוז חיסכון אמיתי מחושב מהמחירים שהוגדרו, לא מספר קבוע.
    yearly,
    yearlySavingsPercent: yearly && monthly * 12 > yearly
      ? Math.round((1 - yearly / (monthly * 12)) * 100)
      : null,
  };
}

function isMethodAvailable(method: SubscriptionPayMethod): boolean {
  const m = getPaymentMethods();
  if (method === 'bit') return !!m.bit;
  if (method === 'paybox') return !!m.paybox;
  return !!m.bank;
}

function generateReference(): string {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  return `SB-${code}`;
}

// ===== צד משתמש =====

export async function listUserRequests(userId: string, limit = 10): Promise<ISubscriptionRequest[]> {
  return SubscriptionRequest.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

export async function getOpenRequest(userId: string): Promise<ISubscriptionRequest | null> {
  return SubscriptionRequest.findOne({ userId, status: { $in: OPEN_STATUSES } }).sort({ createdAt: -1 });
}

/** יצירת בקשה (או עדכון בקשה פתוחה שעוד לא דווח עליה תשלום). */
export async function createRequest(userId: string, months: number, method: SubscriptionPayMethod): Promise<ISubscriptionRequest> {
  if (!(ALLOWED_MONTHS as readonly number[]).includes(months)) {
    throw ValidationError.single('months', 'Invalid subscription period');
  }
  if (months === 12 && !env.PRO_PRICE_YEARLY) {
    throw ValidationError.single('months', 'Yearly plan is not available');
  }
  if (!isMethodAvailable(method)) {
    throw new AppError('This payment method is not available', 503, 'PAYMENT_METHOD_UNAVAILABLE');
  }

  const open = await getOpenRequest(userId);
  if (open) {
    if (open.status === 'reported') {
      throw new ConflictError('You already have a payment awaiting approval', 'REQUEST_ALREADY_REPORTED');
    }
    open.months = months;
    open.method = method;
    open.amount = priceForMonths(months);
    await open.save();
    return open;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await SubscriptionRequest.create({
        userId: new mongoose.Types.ObjectId(userId),
        months,
        method,
        amount: priceForMonths(months),
        currency: 'ILS',
        reference: generateReference(),
      });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  throw new AppError('Could not create request, try again', 500, 'REQUEST_CREATE_FAILED');
}

async function findOwned(userId: string, requestId: string): Promise<ISubscriptionRequest> {
  const req = await SubscriptionRequest.findOne({ _id: requestId, userId });
  if (!req) throw new NotFoundError('Subscription request');
  return req;
}

/** המשתמש מדווח "שילמתי" - עובר לתור האישור של האדמין. */
export async function reportPaid(userId: string, requestId: string): Promise<ISubscriptionRequest> {
  const req = await findOwned(userId, requestId);
  if (req.status === 'reported') return req;
  if (req.status !== 'pending') {
    throw new ConflictError('This request can no longer be reported', 'REQUEST_NOT_OPEN');
  }
  req.status = 'reported';
  req.reportedAt = new Date();
  await req.save();

  void (async () => {
    const [user, adminIds] = await Promise.all([UserDAL.findById(userId), UserDAL.findAdminIds()]);
    await Promise.all([
      sendAdminNotice(
        `דיווח תשלום מנוי: ${req.reference}`,
        [
          `משתמש: ${user?.name ?? '?'} (${user?.email ?? '?'})`,
          `סכום: ₪${req.amount} עבור ${req.months} חודשים`,
          `אמצעי: ${req.method}`,
          `קוד הפניה: ${req.reference}`,
          '',
          'בדוק שההעברה נכנסה ואשר בפאנל האדמין.',
        ].join('\n'),
      ),
      sendToUsers(adminIds, {
        title: '💳 תשלום מנוי ממתין לאישור',
        body: `${user?.name ?? 'משתמש'} · ₪${req.amount} · קוד ${req.reference}`,
        data: { url: '/admin', type: 'subscription_request' },
      }),
    ]);
  })().catch((e) => logger.warn('subscription admin notice failed: %s', (e as Error).message));

  return req;
}

export async function cancelRequest(userId: string, requestId: string): Promise<void> {
  const req = await findOwned(userId, requestId);
  if (!OPEN_STATUSES.includes(req.status)) return;
  req.status = 'cancelled';
  req.resolvedAt = new Date();
  await req.save();
}

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

  const skipped = await User.updateMany(
    { legacyTrialGrantedAt: { $exists: false }, ...skipFilter },
    { $set: { legacyTrialGrantedAt: now } },
  );
  const granted = await User.updateMany(
    { legacyTrialGrantedAt: { $exists: false }, $nor: [skipFilter] },
    { $set: { plan: 'pro', planExpiresAt: targetExpiry, planAutoRenew: false, planSource: 'trial', legacyTrialGrantedAt: now } },
  );

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
    title: 'המנוי שלך הופעל',
    body: 'תודה! מנוי Pro פעיל עכשיו ואפשר ליהנות מהכל ללא הגבלה.',
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
    data: { url: '/subscription', type: 'subscription' },
  }).catch(() => { /* push הוא בונוס */ });

  return req;
}
