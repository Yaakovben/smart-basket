import type { Response } from 'express';
import { InsightsService } from '../services/insights.service';
import { PriceComparisonService } from '../services/priceComparison.service';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

export class InsightsController {
  static getInsights = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const insights = await InsightsService.getUserInsights(userId);

    res.json({ success: true, data: insights });
  });

  // ניסיוני: השוואת מחירים (אושר עד)
  static getPriceComparison = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const data = await PriceComparisonService.getComparisonForUser(userId);
    res.json({ success: true, data });
  });
}
