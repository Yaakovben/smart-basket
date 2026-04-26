import type { Response } from 'express';
import { getComparisonForUser } from '../services/priceComparison.service';
import { asyncHandler } from '../../../utils';
import type { AuthRequest } from '../../../types';

// ניסיוני: השוואת מחירים מול אושר עד
export const getComparison = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const data = await getComparisonForUser(userId);
  res.json({ success: true, data });
});
