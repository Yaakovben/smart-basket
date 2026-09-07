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
