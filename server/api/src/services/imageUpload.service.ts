/**
 * imageUpload.service.ts
 *
 * העלאת תמונת מוצר ל-Cloudinary דרך השרת. הלקוח שולח תמונה דחוסה
 * (data URL) ל-POST /api/uploads/product-image, השרת מעלה אותה ל-Cloudinary
 * עם ה-API secret (סוד אמיתי, אף פעם לא בקליינט) ומחזיר רק את כתובת ה-https.
 *
 * מבודד בכוונה לקובץ אחד: אם נחליף ספק אחסון (S3 וכו') - רק הקובץ הזה משתנה.
 * אם משתני הסביבה של Cloudinary חסרים - זורק 503 וה-endpoint מחזיר שגיאה
 * ברורה, והלקוח נופל לאחסון data-URL בתוך מסמך המוצר.
 */

import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/environment';
import { logger } from '../config/logger';
import { AppError } from '../errors';

let configured = false;

export function isImageUploadConfigured(): boolean {
  return !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function ensureConfigured(): void {
  if (!isImageUploadConfigured()) {
    throw new AppError('Image upload is not configured on this server', 503, 'IMAGE_UPLOAD_NOT_CONFIGURED');
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
}

/**
 * מעלה תמונת מוצר ומחזיר את כתובת ה-https הקבועה (secure_url).
 * dataUri: "data:image/jpeg;base64,..." (כבר דחוס בצד לקוח).
 */
export async function uploadProductImage(dataUri: string): Promise<string> {
  ensureConfigured();

  try {
    // בלי transformation על ה-upload עצמו - זה יעכב את התשובה (Cloudinary
    // מעבד לפני שמחזיר). במקום זה: eager_async יוצר ברקע, מיד אחרי
    // ההעלאה, בדיוק את הגרסאות שהלקוח מבקש בפועל (ראו cloudinaryImage.ts:
    // cldThumb/cldPreview) - כך שכשהתמונה מוצגת לראשונה (בדרך כלל בעוד רגע,
    // לא באותו רגע) הגרסה הקטנה כבר מוכנה ב-CDN במקום שהבקשה הראשונה
    // תחכה לעיבוד "on the fly".
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'smart-basket/products',
      resource_type: 'image',
      eager: [
        { crop: 'fill', width: 216, height: 216, fetch_format: 'auto', quality: 'auto' },
        { crop: 'limit', width: 720, fetch_format: 'auto', quality: 'auto' },
      ],
      eager_async: true,
    });
    return result.secure_url;
  } catch (err) {
    logger.warn('Cloudinary upload failed:', err);
    throw new AppError('Image upload failed', 502, 'IMAGE_UPLOAD_FAILED');
  }
}
