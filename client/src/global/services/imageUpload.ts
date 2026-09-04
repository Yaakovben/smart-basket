// ===== העלאת תמונת מוצר =====
// שתי דרכי אחסון, נבחרות אוטומטית לפי הגדרות הסביבה:
//
// 1. Cloudinary (מומלץ לפרודקשן) - כשמוגדרים VITE_CLOUDINARY_CLOUD_NAME
//    ו-VITE_CLOUDINARY_UPLOAD_PRESET (unsigned preset). התמונה עולה ישירות
//    מהדפדפן ל-Cloudinary, ובמסמך המוצר נשמרת רק כתובת https קצרה.
//
// 2. נפילה ל-data URL - כשאין Cloudinary מוגדר. התמונה נדחסת חזק ונשמרת
//    כ-data:image/jpeg;base64,... בתוך מסמך המוצר עצמו. עובד מיידית בלי
//    שירות חיצוני, אבל מנפח את תגובת ה-API של הרשימה - מיועד לפיתוח/דמו
//    ולנפחי שימוש קטנים בלבד.
//
// המחרוזת שחוזרת מ-uploadProductImage נשמרת כמו שהיא בשדה product.image,
// והשרת מאמת אותה (productValidator: https בלבד או data:image/...).

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = (): boolean => !!(CLOUD_NAME && UPLOAD_PRESET);

// גודל מקסימלי של קובץ נכנס (לפני דחיסה) - מעבר לזה דוחים מיד בלי לנסות
// לטעון לזיכרון. 25MB מכסה כל תצלום ממצלמת טלפון סבירה.
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

// יעד דחיסה: Cloudinary מקבל תמונה גדולה יחסית (הוא עושה טרנספורמציות
// בצד שרת), נפילת ה-data-URL חייבת להיות קטנה כי היא נשמרת ב-DB.
const CLOUDINARY_MAX_DIM = 1600;
const CLOUDINARY_QUALITY = 0.85;
const DATAURL_MAX_DIM = 900;
const DATAURL_QUALITY = 0.7;
// תקרת בטיחות ל-data URL (השרת חוסם ב-500KB; משאירים שוליים). אם גם
// אחרי הדחיסה חורגים - מנמיכים איכות בעוד צעד אחד ואז מוותרים.
const DATAURL_MAX_BYTES = 450 * 1024;

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
// דפדפנים מודרניים מיישרים אוטומטית ב-drawImage מאז ~2020, לא נוגעים בזה.
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

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};

const uploadToCloudinary = async (file: File): Promise<string> => {
  const compressed = await resizeToJpegDataUrl(file, CLOUDINARY_MAX_DIM, CLOUDINARY_QUALITY);
  const blob = await dataUrlToBlob(compressed);

  const form = new FormData();
  form.append('file', blob);
  form.append('upload_preset', UPLOAD_PRESET!);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new ImageUploadError('network', 'Could not reach the image server');
  }
  if (!res.ok) {
    throw new ImageUploadError(res.status >= 500 ? 'network' : 'unknown', `Cloudinary responded ${res.status}`);
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url || !/^https:\/\//i.test(json.secure_url)) {
    throw new ImageUploadError('unknown', 'Cloudinary response missing secure_url');
  }
  return json.secure_url;
};

const buildDataUrlFallback = async (file: File): Promise<string> => {
  let out = await resizeToJpegDataUrl(file, DATAURL_MAX_DIM, DATAURL_QUALITY);
  if (approxBytesOfDataUrl(out) > DATAURL_MAX_BYTES) {
    out = await resizeToJpegDataUrl(file, Math.round(DATAURL_MAX_DIM * 0.75), 0.6);
  }
  if (approxBytesOfDataUrl(out) > DATAURL_MAX_BYTES) {
    throw new ImageUploadError('too-large', 'Image is still too large after compression');
  }
  return out;
};

/**
 * מעלה תמונת מוצר ומחזיר את הערך שיישמר ב-product.image:
 * כתובת https (Cloudinary) או data URL דחוס (נפילה). זורק ImageUploadError.
 */
export const uploadProductImage = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new ImageUploadError('decode', 'Selected file is not an image');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageUploadError('too-large', 'Image file is too large');
  }
  if (isCloudinaryConfigured()) {
    return uploadToCloudinary(file);
  }
  return buildDataUrlFallback(file);
};
