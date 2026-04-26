/**
 * daily-faith.controller.ts
 *
 * Controller של "החיזוק היומי" - ציטוטי חיזוק שמוצגים למשתמש.
 * מותקן ב-/api/daily-faith ב-routes/index.ts.
 *
 * הרשאות:
 *  - getRandom פתוח לכל משתמש מאומת
 *  - getAll / create / remove רק לאדמין
 */

import type { Response } from 'express';
import type { AuthRequest } from '../../types';
import { DailyFaithDAL } from './daily-faith.dal';
import { AppError, NotFoundError } from '../../errors';
import { asyncHandler, sanitizeText } from '../../utils';

// ====================== עזר ======================

// המרה של מסמך Mongoose לאובייקט שמוחזר ללקוח (מסנן שדות פנימיים)
const transform = (doc: { toJSON: () => Record<string, unknown> }) => {
  const json = doc.toJSON();
  return {
    id: json.id as string,
    text: json.text as string,
    createdAt: json.createdAt as Date,
  };
};

// ====================== Handlers ======================

/**
 * GET /api/daily-faith/random
 * מחזיר ציטוט אחד אקראי. פתוח לכל משתמש מאומת.
 */
export const getRandom = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const quote = await DailyFaithDAL.findRandom();
  res.json({ success: true, data: quote ? transform(quote) : null });
});

/**
 * GET /api/daily-faith
 * רשימת כל הציטוטים (לניהול). רק אדמין.
 */
export const getAll = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const quotes = await DailyFaithDAL.findAllSorted();
  res.json({ success: true, data: quotes.map(transform) });
});

/**
 * POST /api/daily-faith
 * יצירת ציטוט חדש. רק אדמין. דורש text בין 2-500 תווים.
 */
export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const text = sanitizeText(req.body.text || '').trim();

  if (!text || text.length < 2) {
    throw new AppError('טקסט המשפט חייב להכיל לפחות 2 תווים', 400, 'INVALID_INPUT');
  }
  if (text.length > 500) {
    throw new AppError('טקסט המשפט חורג מ-500 תווים', 400, 'INVALID_INPUT');
  }

  const quote = await DailyFaithDAL.create({
    text,
    createdBy: req.user!.id,
  } as never);

  res.status(201).json({ success: true, data: transform(quote) });
});

/**
 * DELETE /api/daily-faith/:id
 * מחיקה. רק אדמין.
 */
export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const deleted = await DailyFaithDAL.deleteById(req.params.id);
  if (!deleted) throw new NotFoundError('DailyFaith');
  res.json({ success: true });
});
