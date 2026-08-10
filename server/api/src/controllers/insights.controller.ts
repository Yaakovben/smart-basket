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
  // _timing: אבחון זמני (ראו GetUserInsightsOptions.timings) - breakdown של
  // זמני ריצה בפועל לכל שלב, לאיתור צוואר הבקבוק האמיתי בפרודקשן. להסיר
  // אחרי איתור הבעיה.
  const timings: Record<string, number> = {};
  const totalStart = Date.now();
  const insights = await getUserInsights(userId, { timings });
  timings.total = Date.now() - totalStart;
  res.json({ success: true, data: insights, _timing: timings });
});
