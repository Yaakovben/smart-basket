// ===== תמונת מוצר: דחיסה + העלאה =====
//
// זרימה בשני שלבים (ראה ProductImageField):
//   1. compressProductImage(file)  -> data URL דחוס. מהיר ועמיד. זה מה
//      שמוצג למשתמש *מיד* וגם מה שנשמר על המוצר אם שלב 2 לא מסתיים.
//   2. uploadToServer(dataUrl)     -> POST /api/uploads/product-image,
//      השרת מעלה ל-Cloudinary (עם ה-secret) ומחזיר כתובת https קצרה.
//      רץ ברקע; אם מצליח, מחליפים את ה-data URL בכתובת.
//
// שום מפתח/סוד לא חשוף בקוד הצד-לקוח. אם השרת בלי Cloudinary (503) -
// נשארים עם ה-data URL הדחוס (נשמר במסמך המוצר). מיועד לדמו/פיתוח.

import { uploadsApi } from '../../services/api';

export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

// יעד דחיסה. השרת חוסם את שדה product.image ב-500,000 תווים, וזה כולל
// base64 (~1.37x מהבייטים) + תחילית - לכן ה-data URL חייב להישאר קטן
// גם כשאין Cloudinary. 820px / איכות 0.68 נותן ~150-300KB לצילום טיפוסי.
const TARGET_MAX_DIM = 820;
const TARGET_QUALITY = 0.68;
// אם עדיין גדול מדי - עוד ניסיון אחד קטן יותר, ואז מוותרים.
const RETRY_MAX_DIM = 560;
const RETRY_QUALITY = 0.6;
// תקרה על הבייטים הגולמיים כך שה-data URL השלם < 500K תווים.
const DATAURL_MAX_BYTES = 340 * 1024;
// data URL של JPEG אמיתי לעולם לא קצר מזה. פחות = ה-canvas יצא ריק
// (באג ידוע ב-iOS Safari על תמונות ענק) - זורקים במקום לשמור ריבוע לבן.
const MIN_VALID_DATAURL_LEN = 1500;

export type ImageUploadErrorCode = 'too-large' | 'decode' | 'network' | 'unknown';

export class ImageUploadError extends Error {
  readonly code: ImageUploadErrorCode;
  constructor(code: ImageUploadErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ImageUploadError';
    this.code = code;
  }
}

const approxBytesOfDataUrl = (dataUrl: string): number => {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor(b64.length * 0.75);
};

const readAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageUploadError('decode', 'Could not read the image file'));
    reader.readAsDataURL(blob);
  });

// ציור source (bitmap או img) לקנבס בגודל יעד -> JPEG data URL.
const drawToJpeg = (
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxDim: number,
  quality: number,
): string => {
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageUploadError('decode', 'Canvas 2D context unavailable');
  // רקע לבן - JPEG בלי שקיפות; PNG שקוף היה יוצא שחור
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
};

// createImageBitmap עם resize מובנה - הדרך העמידה ביותר לתמונות גדולות
// ממצלמת טלפון. מיישר EXIF (imageOrientation) ולא נופל על מגבלת הקנבס
// הענק של iOS Safari (שמייצרת פלט ריק/שחור). נפילה ל-<img>+canvas אם
// הדפדפן לא תומך.
const decodeAndResize = async (file: File, maxDim: number, quality: number): Promise<string> => {
  if (typeof createImageBitmap === 'function') {
    try {
      // resizeWidth/Height מבקשים מהדפדפן להקטין כבר בשלב הפענוח
      const probe = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const scale = Math.min(1, maxDim / Math.max(probe.width, probe.height));
      const rw = Math.max(1, Math.round(probe.width * scale));
      const rh = Math.max(1, Math.round(probe.height * scale));
      probe.close?.();
      const bmp = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        resizeWidth: rw,
        resizeHeight: rh,
        resizeQuality: 'high',
      });
      const out = drawToJpeg(bmp, bmp.width, bmp.height, maxDim, quality);
      bmp.close?.();
      if (out.length >= MIN_VALID_DATAURL_LEN) return out;
    } catch {
      // ממשיכים לנתיב ה-<img>
    }
  }

  const dataUrl = await readAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new ImageUploadError('decode', 'Could not decode the image'));
    el.src = dataUrl;
  });
  const out = drawToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxDim, quality);
  if (out.length < MIN_VALID_DATAURL_LEN) {
    throw new ImageUploadError('decode', 'Image processing produced an empty result');
  }
  return out;
};

/**
 * דוחס תמונה ל-data URL קטן ועמיד. מהיר - מיועד להצגה מיידית ולשמירה
 * כשאין אחסון חיצוני. זורק ImageUploadError.
 */
export const compressProductImage = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new ImageUploadError('decode', 'Selected file is not an image');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageUploadError('too-large', 'Image file is too large');
  }

  let out = await decodeAndResize(file, TARGET_MAX_DIM, TARGET_QUALITY);
  if (approxBytesOfDataUrl(out) > DATAURL_MAX_BYTES) {
    out = await decodeAndResize(file, RETRY_MAX_DIM, RETRY_QUALITY);
  }
  if (approxBytesOfDataUrl(out) > DATAURL_MAX_BYTES) {
    throw new ImageUploadError('too-large', 'Image is still too large after compression');
  }
  return out;
};

// 503 + code ייעודי = השרת בלי Cloudinary. שונה משגיאה אמיתית.
export const isNotConfiguredError = (err: unknown): boolean => {
  const e = err as { response?: { status?: number; data?: { code?: string } } } | null;
  return e?.response?.status === 503 && e.response.data?.code === 'IMAGE_UPLOAD_NOT_CONFIGURED';
};

/**
 * מנסה להעלות את ה-data URL לשרת ומחזיר כתובת https קבועה (Cloudinary).
 * זורק את שגיאת ה-API הגולמית - השתמש ב-isNotConfiguredError כדי להבחין
 * בין "אין Cloudinary" (להישאר עם ה-data URL) לכשל אמיתי.
 */
export const uploadToServer = (dataUrl: string): Promise<string> =>
  uploadsApi.productImage(dataUrl);
