import type { Response } from 'express';
import { getUserInsights } from '../services/insights.service';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

export const getInsights = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const insights = await getUserInsights(userId);
  res.json({ success: true, data: insights });
});
