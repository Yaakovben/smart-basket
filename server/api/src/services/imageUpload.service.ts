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
  // ספירה חיה מה-DB - כמה *מוצרים* מפנים לכתובת Cloudinary. api.usage()
  // הוא מצרף שמתעדכן בעיכוב יומי, אז "objects" למעלה יכול להישאר קבוע גם
  // אחרי העלאה אמיתית. liveObjectCount מדויק לרגע.
  liveObjectCount?: number;
  // ספירת קבצים *בפועל* בתיקיית המוצרים ב-Cloudinary (api.resources, מדויק
  // לרגע). deadReferenceCount = כמה מוצרים מפנים ל-URL שכבר לא קיים שם
  // (נמחק ידנית מלוח הבקרה של Cloudinary וכו').
  cloudinaryFileCount?: number;
  deadReferenceCount?: number;
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

  // מקבילית ל-Cloudinary עצמו:
  //  - u: דוח השימוש המצרפי (מתעדכן בעיכוב יומי)
  //  - productImages: כל כתובות ה-Cloudinary שמוצרים מפנים אליהן כרגע
  //  - existingFileIds: ה-public_id-ים שקיימים *בפועל* בתיקיית המוצרים
  //    (api.resources, מדויק לרגע). ההצלבה נותנת deadReferenceCount -
  //    מוצרים שמפנים לקובץ שכבר נמחק (למשל ידנית ב-Cloudinary).
  const [u, productImages, existingFileIds] = await Promise.all([
    cloudinary.api.usage() as Promise<Record<string, any>>,
    Product.find({ image: { $regex: '^https://res\\.cloudinary\\.com/' } }).select('image').lean(),
    (async (): Promise<Set<string> | null> => {
      try {
        const ids = new Set<string>();
        let cursor: string | undefined;
        do {
          const page = await cloudinary.api.resources({
            type: 'upload', prefix: UPLOAD_FOLDER, max_results: 500, next_cursor: cursor,
          });
          for (const r of page.resources as Array<{ public_id: string }>) ids.add(r.public_id);
          cursor = page.next_cursor;
        } while (cursor);
        return ids;
      } catch {
        return null; // לא קריטי - נשארים בלי המדדים המדויקים
      }
    })(),
  ]);

  const liveObjectCount = productImages.length;
  const cloudinaryFileCount = existingFileIds ? existingFileIds.size : undefined;
  const deadReferenceCount = existingFileIds
    ? productImages.reduce((n, p) => {
        const id = extractCloudinaryPublicId(p.image as string);
        return n + (id && !existingFileIds.has(id) ? 1 : 0);
      }, 0)
    : undefined;

  const pctFromField = (f: any): number | null => {
    if (typeof f?.used_percent === 'number') return Math.round(f.used_percent * 10) / 10;
    if (typeof f?.usage === 'number' && typeof f?.limit === 'number' && f.limit > 0) {
      return Math.round((f.usage / f.limit) * 1000) / 10;
    }
    return null;
  };

  const creditsPct = pctFromField(u.credits) ?? 0;
  let status: 'ok' | 'warning' | 'critical' =
    creditsPct < 70 ? 'ok' : creditsPct < 90 ? 'warning' : 'critical';
  // מוצרים שמפנים לקובץ שנמחק = לינקים שבורים בפרודקשן. לא "תקין" גם אם
  // המכסה רחוקה.
  if (deadReferenceCount && deadReferenceCount > 0 && status === 'ok') status = 'warning';

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
    cloudinaryFileCount,
    deadReferenceCount,
    status,
  };
}

// תיקייה קבועה - משותפת בין ההעלאה לבין החתימה.
const UPLOAD_FOLDER = 'smart-basket/products';
// eager סינכרוני: *רק* גרסת ה-thumb (זו שמוצגת מיד בשורת הרשימה ובטופס).
// eager_async לא נשלח בכלל -> Cloudinary בונה את הגרסה הזו *לפני* שהוא
// מחזיר תשובה להעלאה, כך שברגע שההעלאה חוזרת ה-thumb כבר קיים ב-CDN
// (בלי "on the fly" איטי בטעינה הראשונה, בלי צורך לחכות ל-eager שרץ
// ברקע). זו גרסה אחת קטנה - התוספת לזמן ההעלאה זניחה (~100-300ms).
//
// preview/full/blur (cldPreview/cldFull/cldBlur ב-client) *אינם* כאן -
// הם נוצרים on-the-fly בבקשה הראשונה ואז נשמרים לנצח ב-CDN של Cloudinary.
// הם נצרכים רק בלייטבוקס/פרטי-מוצר (פעולה מכוונת, ProgressiveImage מציג
// blur/thumb מתחת בינתיים) - לא שווה להשהות את *כל* העלאה בשבילם.
//
// חשוב: 'c_fill,w_360,h_360,f_auto,q_auto' חייב להישאר זהה מילה-במילה
// ל-cldThumb ב-client/src/global/helpers/cloudinaryImage.ts - אחרת ה-
// eager מייצר גרסה שאף בקשה לא מבקשת, וזו שכן מבוקשת נוצרת "on the fly".
const UPLOAD_EAGER_THUMB = 'c_fill,w_360,h_360,f_auto,q_auto';

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
  // eager_async לא נחתם ולא נשלח -> ברירת המחדל (סינכרוני): Cloudinary
  // בונה את גרסת ה-thumb לפני שהוא מחזיר תשובה. הלקוח חייב גם הוא לא
  // לשלוח eager_async (ראו uploads.api.ts) - כל פרמטר שנשלח ולא נחתם
  // פוסל את החתימה.
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: UPLOAD_FOLDER, eager: UPLOAD_EAGER_THUMB },
    env.CLOUDINARY_API_SECRET!,
  );
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder: UPLOAD_FOLDER,
    eager: UPLOAD_EAGER_THUMB,
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

// ביטול העלאה שלא נוצלה - הלקוח בחר תמונה בטופס "הוסף מוצר" (עלתה מיד
// ברקע ל-Cloudinary), ואז ביטל / החליף / סגר בלי לשמור. אין מוצר שמפנה
// אליה - היא יתומה. הלקוח שולח לכאן את ה-URL כשזה קורה (ראו uploads.api /
// useAddProduct). מוגן: מוחקים *רק* אם (א) זו כתובת Cloudinary בתיקיית
// המוצרים שלנו, ו-(ב) שום מוצר לא מפנה אליה - כך משתמש לא יכול למחוק
// תמונה של מוצר אמיתי (שלו או של אחר), רק יתומה שכבר לא בשימוש.
export async function discardUnusedUpload(url: string | undefined | null): Promise<{ discarded: boolean }> {
  if (!url || !isImageUploadConfigured()) return { discarded: false };
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId || !publicId.startsWith(`${UPLOAD_FOLDER}/`)) return { discarded: false };
  const referencedBy = await Product.countDocuments({ image: url }, { limit: 1 });
  if (referencedBy > 0) return { discarded: false }; // בשימוש - לא נוגעים
  await deleteCloudinaryImage(url);
  return { discarded: true };
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

// ===== תמונות ששמורות מקומית (data URL) בתוך מסמך המוצר עצמו =====
// כל תמונה שהעלאתה ל-Cloudinary לא הצליחה (לא מוגדר בשרת, או שהעלאה
// אמיתית נכשלה - ראו product.service.ts/ProductImageField.tsx) נשארת
// כ-data URL ישירות בשדה Product.image, ולא כ-URL קצר. זה תופס מקום
// אמיתי בתוך ה-DB עצמו (maxlength 500,000 תווים לתמונה בודדת ב-
// Product.model.ts) - בניגוד לתמונה שכן עברה ל-Cloudinary, שרק ה-URL
// שלה (כמה עשרות בייטים) יושב במסמך.
export interface LocalImagesStats {
  count: number;
  totalBytes: number;
}

const LOCAL_IMAGE_FILTER = { image: { $regex: '^data:' } };

export async function getLocalImagesStats(): Promise<LocalImagesStats> {
  const result = await Product.aggregate([
    { $match: LOCAL_IMAGE_FILTER },
    { $group: { _id: null, count: { $sum: 1 }, totalBytes: { $sum: { $strLenBytes: '$image' } } } },
  ]);
  const r = result[0] as { count: number; totalBytes: number } | undefined;
  return { count: r?.count ?? 0, totalBytes: r?.totalBytes ?? 0 };
}

// מסיר את שדה image (לא מוחק את המוצר עצמו - הוא נשאר, רק בלי תמונה,
// בדיוק כמו מוצר שאף פעם לא קיבל תמונה) מכל מוצר עם תמונה שמורה מקומית.
// מחזיר כמה מוצרים שונו בפועל.
export async function clearLocalImages(): Promise<number> {
  const result = await Product.updateMany(LOCAL_IMAGE_FILTER, { $set: { image: '' } });
  return result.modifiedCount;
}

// מעביר תמונות data-URL ל-Cloudinary: מעלה כל אחת (Cloudinary מקבל data
// URI כמקור), ומחליף את שדה image ב-secure_url הקצר. כך *נשמרת* התמונה
// (בניגוד ל-clearLocalImages שמוחק אותה) וגם משתחרר מקום ב-DB. מטפל בכל
// data-URL שנוצר: העלאה שנכשלה, מכשיר שהיה אופליין בזמן ההוספה, או שרת
// שהיה בלי Cloudinary באותו רגע.
//
// עובד במנות קטנות (maxToProcess) עם קצת מקביליות - data-URL בודד יכול
// להיות ~300KB וההעלאה לוקחת זמן; מנה גדולה מדי הייתה חורגת מ-timeout
// הבקשה. מחזיר remaining כדי שהלקוח יריץ שוב עד שנגמר.
export interface LocalImagesMigration {
  attempted: number;
  migrated: number;
  failed: number;
  freedBytes: number;
  remaining: number;
}

export async function migrateLocalImagesToCloudinary(maxToProcess = 40): Promise<LocalImagesMigration> {
  if (!isImageUploadConfigured()) {
    const remaining = await Product.countDocuments(LOCAL_IMAGE_FILTER);
    return { attempted: 0, migrated: 0, failed: 0, freedBytes: 0, remaining };
  }
  ensureConfigured();

  const docs = await Product.find(LOCAL_IMAGE_FILTER).select('image').limit(maxToProcess).lean();
  let migrated = 0;
  let failed = 0;
  let freedBytes = 0;

  const CONCURRENCY = 4;
  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const batch = docs.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (doc) => {
      const dataUri = doc.image as string;
      try {
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: UPLOAD_FOLDER,
          eager: UPLOAD_EAGER_THUMB,
        });
        await Product.updateOne({ _id: doc._id }, { $set: { image: result.secure_url } });
        migrated += 1;
        freedBytes += Buffer.byteLength(dataUri, 'utf8');
      } catch (err) {
        failed += 1;
        logger.warn('[cloudinary] failed to migrate local image', String(doc._id), err);
      }
    }));
  }

  const remaining = await Product.countDocuments(LOCAL_IMAGE_FILTER);
  logger.info(`[cloudinary] local-image migration: migrated=${migrated} failed=${failed} remaining=${remaining}`);
  return { attempted: docs.length, migrated, failed, freedBytes, remaining };
}
