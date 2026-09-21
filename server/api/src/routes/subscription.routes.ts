import { Router } from 'express';
import Joi from 'joi';
import { authenticate, validate } from '../middleware';
import { asyncHandler } from '../utils';
import { UserDAL } from '../dal';
import { PLAN_LIMITS, isPro } from '../constants';
import { env } from '../config/environment';
import { planUsage } from '../services/plan-usage.service';
import {
  getPlansCatalog, getPaymentMethods, getOpenRequest, listUserRequests,
  createRequest, reportPaid, cancelRequest, ALLOWED_MONTHS,
} from '../services/subscription.service';
import type { ISubscriptionRequest } from '../models';
import type { AuthRequest } from '../types';
import type { Response } from 'express';

const router = Router();
router.use(authenticate);

const serializeRequest = (r: ISubscriptionRequest) => ({
  id: String(r._id),
  months: r.months,
  amount: r.amount,
  currency: r.currency,
  method: r.method,
  reference: r.reference,
  status: r.status,
  createdAt: r.createdAt,
  reportedAt: r.reportedAt ?? null,
  resolvedAt: r.resolvedAt ?? null,
  adminNote: r.adminNote ?? null,
});

// GET /api/subscription - מצב המנוי, שימוש יומי, קטלוג מחירים, אמצעי תשלום
// זמינים, הבקשה הפתוחה והיסטוריה. הכל מהשרת - הלקוח לא מחזיק מחירים/פרטי
// תשלום משלו, כדי שלא יוצג מידע לא נכון.
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const user = await UserDAL.findById(userId);
  // מצב אפקטיבי: Pro שפג תוקפו נחשב חינמי (בלי זה משתמש שהניסיון שלו נגמר עדיין נראה Pro).
  const plan = user && isPro(user) ? 'pro' : 'free';
  const isTrial = plan === 'pro' && user?.planSource === 'trial';
  const trialEnded = plan === 'free' && user?.planSource === 'trial';
  const methods = getPaymentMethods();
  const [openRequest, history] = await Promise.all([getOpenRequest(userId), listUserRequests(userId, 8)]);

  res.json({
    success: true,
    data: {
      plan,
      planExpiresAt: user?.planExpiresAt ?? null,
      isTrial,
      trialEnded,
      trialMonths: env.TRIAL_MONTHS,
      limits: plan === 'pro' ? null : PLAN_LIMITS.free,
      usage: plan === 'pro' ? null : {
        aiToday: planUsage.getAiCount(userId),
        priceToday: planUsage.getPriceCount(userId),
      },
      catalog: { ...getPlansCatalog(), allowedMonths: ALLOWED_MONTHS.filter(m => m !== 12 || !!env.PRO_PRICE_YEARLY) },
      payment: {
        bit: methods.bit,
        paybox: methods.paybox,
        receiverName: env.PAYMENT_RECEIVER_NAME ?? null,
        supportEmail: 'smartbasket129@gmail.com',
      },
      openRequest: openRequest ? serializeRequest(openRequest) : null,
      history: history.map(serializeRequest),
    },
  });
}));

const requestIdParams = Joi.object({ id: Joi.string().hex().length(24).required() });

// POST /api/subscription/requests - פתיחת (או עדכון) בקשת מנוי לפני תשלום
router.post(
  '/requests',
  validate({
    body: Joi.object({
      months: Joi.number().valid(...ALLOWED_MONTHS).required(),
      method: Joi.string().valid('bit', 'paybox').required(),
    }),
  }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { months, method } = req.body as { months: number; method: 'bit' | 'paybox' };
    const request = await createRequest(req.user!.id, months, method);
    res.status(201).json({ success: true, data: serializeRequest(request) });
  }),
);

// POST /api/subscription/requests/:id/paid - "שילמתי", עובר לאישור אדמין
router.post(
  '/requests/:id/paid',
  validate({ params: requestIdParams }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const request = await reportPaid(req.user!.id, req.params.id as string);
    res.json({ success: true, data: serializeRequest(request) });
  }),
);

// DELETE /api/subscription/requests/:id - ביטול בקשה שעדיין לא אושרה
router.delete(
  '/requests/:id',
  validate({ params: requestIdParams }),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await cancelRequest(req.user!.id, req.params.id as string);
    res.json({ success: true });
  }),
);

export default router;
