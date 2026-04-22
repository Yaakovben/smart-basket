import type { Response } from 'express';
import { DailyFaithDAL } from './daily-faith.dal';
import { AppError, NotFoundError } from '../../errors';
import { asyncHandler, sanitizeText } from '../../utils';
import type { AuthRequest } from '../../types';

const transform = (doc: { toJSON: () => Record<string, unknown> }) => {
  const json = doc.toJSON();
  return {
    id: json.id as string,
    text: json.text as string,
    createdAt: json.createdAt as Date,
  };
};

export class DailyFaithController {
  // GET /daily-faith/random
  static getRandom = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const quote = await DailyFaithDAL.findRandom();
    res.json({
      success: true,
      data: quote ? transform(quote) : null,
    });
  });

  // GET /daily-faith (admin)
  static getAll = asyncHandler(async (_req: AuthRequest, res: Response) => {
    const quotes = await DailyFaithDAL.findAllSorted();
    res.json({
      success: true,
      data: quotes.map(transform),
    });
  });

  // POST /daily-faith (admin)
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  // DELETE /daily-faith/:id (admin)
  static remove = asyncHandler(async (req: AuthRequest, res: Response) => {
    const deleted = await DailyFaithDAL.deleteById(req.params.id);
    if (!deleted) throw new NotFoundError('DailyFaith');
    res.json({ success: true });
  });
}
