import { Router } from 'express';
import { authenticate } from '../middleware';
import { asyncHandler } from '../utils';
import { UserDAL } from '../dal';
import { PLAN_LIMITS, isPro } from '../constants';
import { env } from '../config/environment';
import { planUsage } from '../services/plan-usage.service';
import { isStoreBillingConfigured } from '../services/storeSubscription.service';
import type { AuthRequest } from '../types';
import type { Response } from 'express';

const router = Router();
router.use(authenticate);

// מקור המנוי כפי שמוצג ללקוח: חנות, ניסיון במתנה, או מענק ידני של אדמין
// (כולל מנוי קבוע ובקשות תשלום ישנות שאושרו לפני שהמסלול הידני הוסר).
const sourceOf = (planSource: string | undefined): 'store' | 'trial' | 'granted' =>
  planSource === 'store' ? 'store' : planSource === 'trial' ? 'trial' : 'granted';

// GET /api/subscription - מצב המנוי, מגבלות ושימוש יומי, ופרטי הרכישה בחנות.
// הרכישה עצמה נעשית רק ב־App Store / Google Play, והמחיר מגיע מהחנות.
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const user = await UserDAL.findById(userId);
  // מצב אפקטיבי: Pro שפג תוקפו נחשב חינמי (בלי זה משתמש שהניסיון שלו נגמר עדיין נראה Pro).
  const plan = user && isPro(user) ? 'pro' : 'free';
  const isTrial = plan === 'pro' && user?.planSource === 'trial';
  const trialEnded = plan === 'free' && user?.planSource === 'trial';

  res.json({
    success: true,
    data: {
      plan,
      planExpiresAt: user?.planExpiresAt ?? null,
      planSource: plan === 'pro' ? sourceOf(user?.planSource) : null,
      isTrial,
      trialEnded,
      trialMonths: env.TRIAL_MONTHS,
      // תמיד מגבלות החינמי (לא null גם ל-Pro) - כך עמוד המנוי יכול להציג
      // "מה חינמי מול מה Pro" גם למי שכבר Pro, לא רק בזמן שדרוג.
      limits: PLAN_LIMITS.free,
      usage: plan === 'pro' ? null : {
        aiToday: planUsage.getAiCount(userId),
        priceToday: planUsage.getPriceCount(userId),
      },
      supportEmail: 'smartbasket129@gmail.com',
      store: {
        enabled: isStoreBillingConfigured(),
        entitlementId: env.REVENUECAT_ENTITLEMENT_ID,
        // מזהה המשתמש אצלנו משמש גם כמזהה ב-RevenueCat, כדי שה-webhook ידע למי לשייך.
        appUserId: userId,
        // המנוי הנוכחי נרכש בחנות: ניהול וביטול נעשים שם, לא אצלנו.
        isStorePlan: plan === 'pro' && user?.planSource === 'store',
        autoRenew: user?.planAutoRenew ?? false,
      },
    },
  });
}));

export default router;
