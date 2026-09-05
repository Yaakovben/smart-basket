import type { Response } from 'express';
import * as imageUploadService from '../services/imageUpload.service';
import { asyncHandler } from '../utils';
import type { AuthRequest } from '../types';
import type { UploadProductImageInput } from '../validators';

// העלאת תמונת מוצר - מקבל data URL דחוס מהלקוח, מעלה ל-Cloudinary דרך
// השרת (עם ה-secret), ומחזיר את כתובת ה-https בלבד. הלקוח שומר את
// הכתובת ב-product.image.
export const uploadProductImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { image } = req.body as UploadProductImageInput;
  const url = await imageUploadService.uploadProductImage(image);
  res.json({ success: true, data: { url } });
});
