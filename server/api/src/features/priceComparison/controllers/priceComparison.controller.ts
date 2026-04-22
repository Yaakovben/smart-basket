import type { Response } from 'express';
import { PriceComparisonService } from '../services/priceComparison.service';
import { asyncHandler } from '../../../utils';
import type { AuthRequest } from '../../../types';

export class PriceComparisonController {
  // ניסיוני: השוואת מחירים מול אושר עד
  static getComparison = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const data = await PriceComparisonService.getComparisonForUser(userId);
    res.json({ success: true, data });
  });
}
