/**
 * insights.controller.ts
 *
 * Controller של תובנות המשתמש.
 * מחובר ב-routes/insights.routes.ts, ומותקן ב-/api/insights.
 *
 * כל endpoint כאן רק שואב נתונים מה-service ומחזיר JSON —
 * בלי לוגיקה עסקית. הלוגיקה יושבת ב-services/insights.service.ts.
 */

import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { asyncHandler } from '../utils';
import { getUserInsights } from '../services/insights.service';

// ==============================================================
//  GET /api/insights
//  מחזיר את כל התובנות האנליטיות של המשתמש המחובר:
//  מוצרים נפוצים, קטגוריות, סטריקים, אישיות קנייה, מגמות שבועיות וכו׳.
// ==============================================================
export const getInsights = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const insights = await getUserInsights(userId);
  res.json({ success: true, data: insights });
});
