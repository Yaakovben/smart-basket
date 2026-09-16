import { Router } from 'express';
import { authenticate } from '../middleware';
import { asyncHandler } from '../utils';
import { UserDAL } from '../dal';
import { PLAN_LIMITS } from '../constants';
import { planUsage } from '../services/plan-usage.service';
import type { AuthRequest } from '../types';
import type { Response } from 'express';

const router = Router();
router.use(authenticate);

// GET /api/subscription — מצב המנוי הנוכחי של המשתמש + שימוש יומי
router.get('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const user = await UserDAL.findById(userId);
  const plan = user?.plan ?? 'free';

  res.json({
    success: true,
    data: {
      plan,
      planExpiresAt: user?.planExpiresAt ?? null,
      limits: plan === 'pro' ? null : PLAN_LIMITS.free,
      usage: plan === 'pro' ? null : {
        aiToday: planUsage.getAiCount(userId),
        priceToday: planUsage.getPriceCount(userId),
      },
      priceMonthly: 9.90,
      currency: 'ILS',
    },
  });
}));

// POST /api/subscription/upgrade — stub: בעתיד יפנה לספק תשלום
// כרגע מחזיר הוראות יצירת קשר
router.post('/upgrade', asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'תשלומים בקרוב! צור קשר ל-upgrade@smartbasket.app',
      priceMonthly: 9.90,
      currency: 'ILS',
    },
  });
}));

// DELETE /api/subscription — ביטול עצמי של מנוי Pro
// מאפשר למשתמש לבטל את המנוי שלו (מחזיר לחינמי) בלי צורך לפנות לאדמין
router.delete('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  await UserDAL.updateById(userId, { plan: 'free', planExpiresAt: null });
  res.json({ success: true });
}));

export default router;
