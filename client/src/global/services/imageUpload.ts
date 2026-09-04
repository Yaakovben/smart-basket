// ===== העלאת תמונת מוצר =====
// ההעלאה עוברת דרך שרת ה-API שלנו, לא ישירות מהדפדפן:
//
//   דפדפן  --(תמונה דחוסה)-->  POST /api/uploads/product-image  --> Cloudinary
//                                          (עם ה-API secret, בשרת בלבד)
//   דפדפן  <---------(כתובת https)---------------------------------
//
// שום מפתח/סוד לא חשוף בקוד הצד-לקוח. רק משתמש מחובר יכול להעלות
// (ה-endpoint מאחורי authenticate + rate limit).
//
// אם השרת לא מוגדר עם Cloudinary (מחזיר 503) - נפילה לאחסון data URL דחוס
// בתוך מסמך המוצר. מיועד לפיתוח/דמו; בפרודקשן מגדירים את משתני הסביבה
// של Cloudinary בשרת.

import { uploadsApi } from '../../services/api';

// גודל מקסימלי של קובץ נכנס (לפני דחיסה) - מעבר לזה דוחים מיד.
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

// יעד דחיסה בצד לקוח. השרת + Cloudinary עושים אופטימיזציה נוספת, אבל
// שולחים כבר משהו סביר כדי שה-POST לא יהיה כבד. הנפילה ל-data URL
// (כשאין Cloudinary) חייבת להיות קטנה כי היא נשמרת ב-DB.
const UPLOAD_MAX_DIM = 1280;
const UPLOAD_QUALITY = 0.8;
const DATAURL_MAX_DIM = 820;
const DATAURL_QUALITY = 0.68;
// תקרת בטיחות ל-data URL. השרת חוסם את שדה product.image ב-500,000 תווים,
// וזה כולל את קידוד ה-base64 (~1.37x מהבייטים הגולמיים) + התחילית. לכן
// התקרה כאן על הבייטים הגולמיים חייבת להיות ~340KB כדי שה-data URL השלם
// יישאר מתחת ל-500K תווים ולא יידחה בשמירת המוצר.
const DATAURL_MAX_BYTES = 340 * 1024;

export type ImageUploadErrorCode = 'too-large' | 'decode' | 'network' | 'unknown';

export class ImageUploadError extends Error {
  // שדה מפורש ולא parameter-property - tsconfig כאן מגדיר erasableSyntaxOnly
  readonly code: ImageUploadErrorCode;
  constructor(code: ImageUploadErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ImageUploadError';
    this.code = code;
  }
}

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageUploadError('decode', 'Could not read the image file'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new ImageUploadError('decode', 'Could not decode the image'));
    el.src = src;
  });

const approxBytesOfDataUrl = (dataUrl: string): number => {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor(b64.length * 0.75);
};

// דחיסה + שינוי גודל דרך canvas. מחזיר JPEG data URL. EXIF orientation:
// דפדפנים מודרניים מיישרים אוטומטית ב-drawImage מאז ~2020.
const resizeToJpegDataUrl = async (file: File, maxDim: number, quality: number): Promise<string> => {
  const srcDataUrl = await readAsDataUrl(file);
  const img = await loadImage(srcDataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageUploadError('decode', 'Canvas 2D context unavailable');
  // רקע לבן - JPEG לא תומך שקיפות, בלי זה PNG שקוף יוצא שחור
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
};

const shrinkForDataUrlFallback = async (file: File): Promise<string> => {
  let out = await resizeToJpegDataUrl(file, DATAURL_MAX_DIM, DATAURL_QUALITY);
  if (approxBytesOfDataUrl(out) > DATAURL_MAX_BYTES) {
    out = await resizeToJpegDataUrl(file, Math.round(DATAURL_MAX_DIM * 0.75), 0.6);
  }
  if (approxBytesOfDataUrl(out) > DATAURL_MAX_BYTES) {
    throw new ImageUploadError('too-large', 'Image is still too large after compression');
  }
  return out;
};

// זיהוי "השרת לא מוגדר עם Cloudinary" (503 + code ייעודי) מול שגיאה אמיתית.
const isNotConfigured = (err: unknown): boolean => {
  const e = err as { response?: { status?: number; data?: { code?: string } } } | null;
  return e?.response?.status === 503 && e.response.data?.code === 'IMAGE_UPLOAD_NOT_CONFIGURED';
};

const isNetwork = (err: unknown): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const e = err as { response?: unknown; code?: string; message?: string } | null;
  if (!e) return false;
  if (!e.response) return e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED' || e.message === 'Network Error';
  const status = (e.response as { status?: number }).status;
  return status === 502 || status === 503 || status === 504;
};

/**
 * מעלה תמונת מוצר ומחזיר את הערך שיישמר ב-product.image:
 * כתובת https (Cloudinary דרך השרת) או data URL דחוס (נפילה).
 * זורק ImageUploadError.
 */
export const uploadProductImage = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new ImageUploadError('decode', 'Selected file is not an image');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageUploadError('too-large', 'Image file is too large');
  }

  const compressed = await resizeToJpegDataUrl(file, UPLOAD_MAX_DIM, UPLOAD_QUALITY);

  try {
    return await uploadsApi.productImage(compressed);
  } catch (err) {
    // השרת לא מוגדר - נפילה שקטה ל-data URL דחוס (מצב פיתוח/דמו)
    if (isNotConfigured(err)) {
      return shrinkForDataUrlFallback(file);
    }
    if (isNetwork(err)) {
      throw new ImageUploadError('network', 'Could not reach the server');
    }
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 413 || status === 400) {
      throw new ImageUploadError('too-large', 'Server rejected the image');
    }
    throw new ImageUploadError('unknown', 'Image upload failed');
  }
};
