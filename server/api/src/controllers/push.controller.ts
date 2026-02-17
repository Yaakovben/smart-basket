import type { Request, Response } from 'express';
import { PushService } from '../services';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

/** קבלת מפתח VAPID ציבורי */
export const getVapidPublicKey = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const publicKey = PushService.getPublicKey();

  if (!publicKey) {
    res.status(503).json({
      success: false,
      message: 'Push notifications are not configured',
    });
    return;
  }

  res.json({
    success: true,
    data: { publicKey },
  });
});

/** הרשמה להתראות push */
export const subscribe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { subscription } = req.body;

  await PushService.subscribe(userId, subscription);

  res.json({
    success: true,
    message: 'Subscribed to push notifications',
  });
});

/** ביטול הרשמה להתראות push */
export const unsubscribe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { endpoint } = req.body;

  await PushService.unsubscribe(userId, endpoint);

  res.json({
    success: true,
    message: 'Unsubscribed from push notifications',
  });
});

/** בדיקת מנוי push */
export const getStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const hasSubscription = await PushService.hasSubscription(userId);

  res.json({
    success: true,
    data: { subscribed: hasSubscription },
  });
});
