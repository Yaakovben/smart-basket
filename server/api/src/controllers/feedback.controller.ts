import type { Response } from 'express';
import { asyncHandler } from '../utils';
import { submitFeedback } from '../services/feedback.service';
import type { AuthRequest } from '../types';

/** POST /api/feedback - שולח את משוב המשתמש (דירוג + הודעה אופציונלית). */
export const createFeedback = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { rating, message } = req.body as { rating: number; message?: string };
  await submitFeedback(req.user!.id, rating, message);
  res.json({ success: true });
});
