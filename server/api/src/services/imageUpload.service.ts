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
import { logger } from '../config/logger';
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
// חייב להיות זהה בדיוק ל-cldThumb/cldPreview/cldFull/cldBlur ב-client/
// cloudinaryImage.ts, גודל-גודל, פרמטר-פרמטר - אחרת אין cache hit על
// הגרסה שבאמת מבוקשת (ראו ההערה שם). preview/full ב-q_auto:best (איכות
// גבוהה - שם המשתמש באמת מסתכל מקרוב); thumb נשאר q_auto רגיל (קטן על
// המסך, אין הבדל נראה, ומהיר יותר).
const UPLOAD_EAGER =
  'c_fill,w_256,h_256,f_auto,q_auto|c_limit,w_800,f_auto,q_auto:best|c_limit,w_1600,f_auto,q_auto:best|c_fill,w_32,h_32,e_blur:1000,q_1,f_auto';

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

// ===== ניקוי תמונות יתומות =====
// כשמוצר מקבל תמונה חדשה, או נמחק, או ננוקה בבת-אחת - הקובץ הישן
// ב-Cloudinary צריך להימחק גם הוא, אחרת הוא נשאר יתום שם לנצח ותופס
// מכסה (Free plan - האחסון חלק ממאגר הקרדיטים המשותף). extractCloudinaryPublicId
// שולפת את ה-public_id מתוך secure_url כדי להעביר ל-uploader.destroy/
// api.delete_resources (שני אלה מצפים ל-public_id, לא ל-URL מלא).
const CLD_URL_RE = /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:v\d+\/)?(.+)\.\w+$/;

export function extractCloudinaryPublicId(url: string): string | null {
  const m = CLD_URL_RE.exec(url);
  return m ? m[1] : null;
}

// מחיקת תמונה בודדת (החלפת תמונה קיימת / מחיקת מוצר בודד). best-effort
// ולא-חוסם בכוונה - כשל כאן (רשת, quota, וכו') לא אמור אף פעם להפיל את
// הבקשה של המשתמש; רק מתועד ללוג. תמונות data-URL (בלי Cloudinary) לא
// תואמות ל-regex ופשוט מדולגות בשקט.
export async function deleteCloudinaryImage(url: string | undefined | null): Promise<void> {
  if (!url) return;
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId || !isImageUploadConfigured()) return;
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn('[cloudinary] failed to delete orphaned image', publicId, err);
  }
}

// מחיקה מרוכזת (ניקוי רשימה - "מחק הכל"/"מחק שנקנו"/"מחק שלא נקנו").
// batch יחיד במקום לולאת destroy() בודדים - הרבה פחות בקשות ל-Cloudinary.
// api.delete_resources מוגבל ל-100 public_id-ים לקריאה - מחלקים לנתחים.
const DELETE_CHUNK_SIZE = 100;

export async function deleteCloudinaryImages(urls: Array<string | undefined | null>): Promise<void> {
  const publicIds = Array.from(new Set(
    urls.map((u) => (u ? extractCloudinaryPublicId(u) : null)).filter((id): id is string => !!id)
  ));
  if (publicIds.length === 0 || !isImageUploadConfigured()) return;
  ensureConfigured();
  for (let i = 0; i < publicIds.length; i += DELETE_CHUNK_SIZE) {
    const chunk = publicIds.slice(i, i + DELETE_CHUNK_SIZE);
    try {
      await cloudinary.api.delete_resources(chunk);
    } catch (err) {
      logger.warn('[cloudinary] failed to batch-delete orphaned images', chunk.length, err);
    }
  }
}

// ===== ניקוי חד-פעמי של תמונות שכבר יתומות =====
// deleteCloudinaryImage/Images (למעלה) עוצרות דליפה חדשה מעכשיו והלאה,
// אבל לא מנקות מה שכבר הצטבר בעבר (לפני שהניקוי הזה נוסף). סורקות את כל
// המשאבים בתיקיית smart-basket/products בפועל, משוות מול כל ה-public_id-ים
// שעדיין מוזכרים במסמכי מוצר - כל מה שלא מוזכר הוא יתום.
export interface CloudinaryOrphanScan {
  totalCloudinaryResources: number;
  referencedCount: number;
  orphanPublicIds: string[];
}

export async function scanCloudinaryOrphans(): Promise<CloudinaryOrphanScan> {
  ensureConfigured();

  const referenced = await Product.find({ image: { $regex: '^https://res\\.cloudinary\\.com/' } })
    .select('image').lean();
  const referencedIds = new Set(
    referenced.map((p) => extractCloudinaryPublicId(p.image as string)).filter((id): id is string => !!id)
  );

  // עימוד - Cloudinary מגביל ל-500 משאבים לעמוד (max_results).
  const allPublicIds: string[] = [];
  let nextCursor: string | undefined;
  do {
    const page = await cloudinary.api.resources({
      type: 'upload',
      prefix: UPLOAD_FOLDER,
      max_results: 500,
      next_cursor: nextCursor,
    });
    for (const resource of page.resources as Array<{ public_id: string }>) {
      allPublicIds.push(resource.public_id);
    }
    nextCursor = page.next_cursor;
  } while (nextCursor);

  const orphanPublicIds = allPublicIds.filter((id) => !referencedIds.has(id));

  return {
    totalCloudinaryResources: allPublicIds.length,
    referencedCount: referencedIds.size,
    orphanPublicIds,
  };
}

// מוחקת בפועל את רשימת ה-public_id-ים היתומים (batch, כמו deleteCloudinaryImages).
// מחזירה כמה נמחקו בפועל וכמה נכשלו - delete_resources מחזיר map של
// public_id -> 'deleted'/'not_found' לכל בקשה, לא רק הצלחה/כישלון גורף.
export async function deleteCloudinaryOrphans(publicIds: string[]): Promise<{ deleted: number; failed: number }> {
  ensureConfigured();
  let deleted = 0;
  let failed = 0;
  for (let i = 0; i < publicIds.length; i += DELETE_CHUNK_SIZE) {
    const chunk = publicIds.slice(i, i + DELETE_CHUNK_SIZE);
    try {
      const result = await cloudinary.api.delete_resources(chunk) as { deleted?: Record<string, string> };
      const deletedInChunk = Object.values(result.deleted ?? {}).filter((status) => status === 'deleted').length;
      deleted += deletedInChunk;
      failed += chunk.length - deletedInChunk;
    } catch (err) {
      logger.warn('[cloudinary] failed to delete orphan chunk', chunk.length, err);
      failed += chunk.length;
    }
  }
  logger.info(`[cloudinary] orphan cleanup: deleted=${deleted} failed=${failed}`);
  return { deleted, failed };
}
