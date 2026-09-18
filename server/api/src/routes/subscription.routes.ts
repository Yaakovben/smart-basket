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
      planAutoRenew: user?.planAutoRenew ?? true,
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

// DELETE /api/subscription — ביטול חידוש אוטומטי (לא ביטול גישה מיידי!)
// המשתמש נשאר Pro עד planExpiresAt - isPro() (plan.constants.ts) כבר
// מכבד את התאריך הזה בכל בדיקת הרשאה, אז אין צורך לגעת ב-plan עצמו כאן.
// משתמש שכבר free (או Pro בלי תאריך תפוגה - הוענק ידנית בלי הגבלת זמן)
// - אין מה "לבטל", מחזירים בהצלחה בלי לשנות כלום.
router.delete('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const user = await UserDAL.findById(userId);
  if (user?.plan === 'pro' && user.planExpiresAt) {
    await UserDAL.updateById(userId, { planAutoRenew: false });
  }
  res.json({ success: true });
}));

export default router;
