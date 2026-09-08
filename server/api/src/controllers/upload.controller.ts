import type { Response } from 'express';
import * as imageUploadService from '../services/imageUpload.service';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';

// חתימה להעלאה ישירה מהלקוח ל-Cloudinary (בלי לעבור דרך השרת) - ראו
// imageUpload.service.ts.
export const getUploadSignature = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const data = imageUploadService.getUploadSignature();
  res.json({ success: true, data });
});

// POST /api/uploads/discard - ביטול העלאה שלא נוצלה (בחרו תמונה בטופס
// "הוסף מוצר" ואז ביטלו/החליפו/סגרו). מוחק רק תמונה יתומה בתיקיית
// המוצרים שלנו (ראו discardUnusedUpload) - לא יכול לפגוע בתמונה של מוצר אמיתי.
export const discardUpload = asyncHandler(async (req: AuthRequest, res: Response) => {
  const url = typeof req.body?.url === 'string' ? req.body.url : undefined;
  const { discarded } = await imageUploadService.discardUnusedUpload(url);
  res.json({ success: true, data: { discarded } });
});
