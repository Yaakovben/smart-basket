/**
 * imageUpload.service.ts
 *
 * תמונת מוצר עולה ישירות מהלקוח ל-Cloudinary (ראו getUploadSignature) -
 * השרת רק חותם את הבקשה עם ה-API secret (סוד אמיתי, אף פעם לא בקליינט),
 * בלי בייטי התמונה עצמם לעבור דרכו.
 *
 * מבודד בכוונה לקובץ אחד: אם נחליף ספק אחסון (S3 וכו') - רק הקובץ הזה משתנה.
 * אם משתני הסביבה של Cloudinary חסרים - זורק 503 וה-endpoint מחזיר שגיאה
 * ברורה, והלקוח נופל לאחסון data-URL בתוך מסמך המוצר.
 */

import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/environment';
import { AppError } from '../errors';
import { Product } from '../models/Product.model';

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
  // ספירה חיה מה-DB (לא מ-Cloudinary) - Cloudinary.api.usage() הוא מצרף
  // מתעדכן בעיכוב מצדם (שעות, לפי התיעוד שלהם), אז "objects" למעלה יכול
  // להישאר קבוע לזמן-מה גם אחרי העלאה אמיתית - "מוסיף ולא רואה שהשתנה".
  // liveObjectCount תמיד מדויק לרגע הבקשה, בלי תלות בעיכוב הדיווח שלהם.
  liveObjectCount?: number;
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

  // מקבילית ל-Cloudinary עצמו - ספירה חיה של מוצרים עם תמונה מאוחסנת שם
  // (לא data URL), בשביל מדד שמתעדכן מיד אחרי העלאה אמיתית.
  const [u, liveObjectCount] = await Promise.all([
    cloudinary.api.usage() as Promise<Record<string, any>>,
    Product.countDocuments({ image: { $regex: '^https://res.cloudinary.com/' } }),
  ]);

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
    liveObjectCount,
    status,
  };
}

// תיקייה + eager קבועים, זהים בדיוק לפרמטרים שהלקוח מזריק דרך
// cloudinaryImage.ts (cldThumb/cldPreview/cldBlur) - אחרת אין cache hit
// על הגרסה שבאמת מבוקשת. משותפים בין ההעלאה (למטה) לבין החתימה.
const UPLOAD_FOLDER = 'smart-basket/products';
// חייב להיות זהה בדיוק ל-cldThumb/cldPreview/cldBlur ב-client/cloudinaryImage.ts.
const UPLOAD_EAGER =
  'c_fill,w_256,h_256,f_auto,q_auto|c_limit,w_800,f_auto,q_auto|c_fill,w_32,h_32,e_blur:1000,q_1,f_auto';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  eager: string;
}

/**
 * חתימה להעלאה ישירה מהלקוח ל-Cloudinary, בלי לעבור דרך השרת הזה בכלל.
 * העלאה "דרך השרת" (כפי שהיה קודם) מכפילה בפועל את זמן ההעלאה - הלקוח
 * שולח את כל בייטי התמונה לשרת שלנו, שרק אז שולח אותם שוב ל-Cloudinary;
 * העלאה ישירה חוסכת את המעבר הכפול הזה (מורגש בעיקר ברשתות סלולריות
 * איטיות). ה-API secret עדיין אף פעם לא מגיע ללקוח - השרת חותם כאן רק
 * פרמטרים קבועים משלו (תיקייה + eager), לא נותן ללקוח לחתום מה שהוא רוצה.
 */
export function getUploadSignature(): UploadSignature {
  ensureConfigured();
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: UPLOAD_FOLDER, eager: UPLOAD_EAGER, eager_async: true },
    env.CLOUDINARY_API_SECRET!,
  );
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder: UPLOAD_FOLDER,
    eager: UPLOAD_EAGER,
  };
}
