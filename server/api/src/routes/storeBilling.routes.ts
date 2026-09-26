import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../middleware';
import { asyncHandler } from '../utils';
import { env } from '../config/environment';
import { logger } from '../config';
import { handleStoreWebhook, syncStoreSubscription } from '../services/storeSubscription.service';
import type { AuthRequest } from '../types';

const router = Router();

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// POST /api/store-billing/webhook - אירועים מ-RevenueCat (רכישה, חידוש, ביטול,
// פקיעה, החזר). מאומת לפי כותרת Authorization שהוגדרה בלוח הבקרה של RevenueCat.
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  const expected = env.REVENUECAT_WEBHOOK_AUTH;
  const got = req.headers.authorization ?? '';
  if (!expected || !(safeEqual(got, expected) || safeEqual(got, `Bearer ${expected}`))) {
    res.status(401).json({ success: false });
    return;
  }
  const event = (req.body as { event?: Record<string, unknown> })?.event;
  if (!event) {
    res.status(400).json({ success: false });
    return;
  }
  logger.info('store webhook: %s for %s', String(event.type), String(event.app_user_id));
  await handleStoreWebhook(event);
  res.json({ success: true });
}));

// POST /api/store-billing/sync - הלקוח קורא אחרי רכישה או שחזור רכישות, כדי
// שהמנוי יופעל מיד בלי לחכות ל-webhook. המצב עצמו נלקח מ-RevenueCat, לא מהלקוח.
router.post('/sync', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await syncStoreSubscription(req.user!.id, true);
  res.json({ success: true, data: { active: result.active, expiresAt: result.expiresAt } });
}));

export default router;
