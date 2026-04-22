/**
 * push.controller.ts
 *
 * Controller של הרשמת Push Notifications.
 * מותקן ב-/api/push. כל הנתיבים (למעט vapid-key) דורשים אימות.
 */

import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import { asyncHandler } from '../utils';
import * as pushService from '../services/push.service';

/**
 * GET /api/push/vapid-public-key
 * החזרת מפתח VAPID הציבורי (לצד הלקוח לצורך יצירת subscription).
 * אם השרת לא מוגדר עם VAPID - מחזיר 503.
 */
export const getVapidPublicKey = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const publicKey = pushService.getPublicKey();

  if (!publicKey) {
    res.status(503).json({
      success: false,
      message: 'Push notifications are not configured',
    });
    return;
  }

  res.json({ success: true, data: { publicKey } });
});

/**
 * POST /api/push/subscribe
 * רישום מנוי Push חדש למשתמש המחובר.
 */
export const subscribe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { subscription } = req.body;

  await pushService.subscribe(userId, subscription);
  res.json({ success: true, message: 'Subscribed to push notifications' });
});

/**
 * POST /api/push/unsubscribe
 * ביטול מנוי Push. עם endpoint בגוף - רק את המכשיר הנוכחי. בלי - את כולם.
 */
export const unsubscribe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { endpoint } = req.body;

  await pushService.unsubscribe(userId, endpoint);
  res.json({ success: true, message: 'Unsubscribed from push notifications' });
});

/**
 * GET /api/push/status
 * בדיקה האם למשתמש יש מנוי Push פעיל כלשהו.
 */
export const getStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const subscribed = await pushService.hasSubscription(userId);
  res.json({ success: true, data: { subscribed } });
});
