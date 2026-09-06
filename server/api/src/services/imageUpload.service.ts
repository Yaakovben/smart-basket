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
export interface CloudinaryUsage {
  configured: boolean;
  plan?: string;
  lastUpdated?: string;
  credits?: { used: number; limit: number; pct: number };
  storage?: { usedBytes: number; limitBytes: number | null; pct: number | null };
  bandwidth?: { usedBytes: number; limitBytes: number | null; pct: number | null };
  transformations?: { used: number; limit: number | null; pct: number | null };
  objects?: number;
  requests?: number;
  status?: 'ok' | 'warning' | 'critical';
}

// חיווי שימוש ב-Cloudinary לפאנל האדמין. משתמש ב-Admin API (api.usage) -
// אותם מפתחות/סוד של ההעלאה. במסלול Free המדד המאוחד הוא "credits"
// (1 קרדיט = 1GB אחסון / 1GB תעבורה / 1000 טרנספורמציות), אז status נגזר
// ממנו. storage/bandwidth/transformations עשויים לבוא בלי limit במסלולים
// מסוימים - מטופל כ-null.
export async function getCloudinaryUsage(): Promise<CloudinaryUsage> {
  if (!isImageUploadConfigured()) return { configured: false };
  ensureConfigured();

  const u = await cloudinary.api.usage() as Record<string, any>;

  const pctFromField = (f: any): number | null => {
    if (typeof f?.used_percent === 'number') return Math.round(f.used_percent * 10) / 10;
    if (typeof f?.usage === 'number' && typeof f?.limit === 'number' && f.limit > 0) {
      return Math.round((f.usage / f.limit) * 1000) / 10;
    }
    return null;
  };

  const creditsPct = pctFromField(u.credits) ?? 0;
  const status: 'ok' | 'warning' | 'critical' =
    creditsPct < 70 ? 'ok' : creditsPct < 90 ? 'warning' : 'critical';

  return {
    configured: true,
    plan: typeof u.plan === 'string' ? u.plan : undefined,
    lastUpdated: typeof u.last_updated === 'string' ? u.last_updated : undefined,
    credits: {
      used: Number(u.credits?.usage ?? 0),
      limit: Number(u.credits?.limit ?? 0),
      pct: creditsPct,
    },
    storage: {
      usedBytes: Number(u.storage?.usage ?? 0),
      limitBytes: typeof u.storage?.limit === 'number' ? u.storage.limit : null,
      pct: pctFromField(u.storage),
    },
    bandwidth: {
      usedBytes: Number(u.bandwidth?.usage ?? 0),
      limitBytes: typeof u.bandwidth?.limit === 'number' ? u.bandwidth.limit : null,
      pct: pctFromField(u.bandwidth),
    },
    transformations: {
      used: Number(u.transformations?.usage ?? 0),
      limit: typeof u.transformations?.limit === 'number' ? u.transformations.limit : null,
      pct: pctFromField(u.transformations),
    },
    objects: typeof u.objects?.usage === 'number' ? u.objects.usage : (typeof u.resources === 'number' ? u.resources : undefined),
    requests: typeof u.requests === 'number' ? u.requests : undefined,
    status,
  };
}

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
      // חייב להישאר זהה בדיוק לפרמטרים ב-cloudinaryImage.ts (לקוח) - אחרת
      // אין cache hit על הגרסה שבאמת מבוקשת.
      eager: [
        { crop: 'fill', width: 160, height: 160, fetch_format: 'auto', quality: 'auto:eco' },
        { crop: 'limit', width: 720, fetch_format: 'auto', quality: 'auto' },
        // blur-up placeholder (32x32, q:1) - נטען כמעט מיידית, מוצג עד
        // שהגרסה החדה נטענת (ProgressiveImage). ראו cldBlur ב-cloudinaryImage.ts.
        { crop: 'fill', width: 32, height: 32, effect: 'blur:1000', quality: 1, fetch_format: 'auto' },
      ],
      eager_async: true,
    });
    return result.secure_url;
  } catch (err) {
    logger.warn('Cloudinary upload failed:', err);
    throw new AppError('Image upload failed', 502, 'IMAGE_UPLOAD_FAILED');
  }
}
