import type { Request, Response } from 'express';
import { PushService } from '../services';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

/**
 * Get VAPID public key for client subscription
 */
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

/**
 * Subscribe to push notifications
 */
export const subscribe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    res.status(400).json({
      success: false,
      message: 'Invalid subscription data',
    });
    return;
  }

  await PushService.subscribe(userId, subscription);

  res.json({
    success: true,
    message: 'Subscribed to push notifications',
  });
});

/**
 * Unsubscribe from push notifications
 */
export const unsubscribe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { endpoint } = req.body;

  await PushService.unsubscribe(userId, endpoint);

  res.json({
    success: true,
    message: 'Unsubscribed from push notifications',
  });
});

/**
 * Check if user has push subscription
 */
export const getStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const hasSubscription = await PushService.hasSubscription(userId);

  res.json({
    success: true,
    data: { subscribed: hasSubscription },
  });
});
