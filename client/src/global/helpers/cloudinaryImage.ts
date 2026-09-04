// ===== גרסאות מוקטנות/מאופטמות של תמונת Cloudinary =====
// ה-secure_url שהשרת מחזיר נראה כך:
//   https://res.cloudinary.com/<cloud>/image/upload/v1234/smart-basket/products/abc.jpg
// הזרקת פרמטרים מיד אחרי /upload/ מבקשת מ-Cloudinary גרסה בגודל/פורמט
// אחרים - Cloudinary מייצר אותה פעם אחת ומגיש מה-CDN שלו מהר מאוד.
//   f_auto  - פורמט מיטבי לדפדפן (WebP/AVIF)
//   q_auto  - איכות אוטומטית (חוסך ~40-60% משקל בלי הבדל נראה)
//   c_limit - לא מגדיל תמונות קטנות, רק מקטין
//   c_fill  - חותך למידות מדויקות (לתמונות ריבועיות בשורה)
//
// data URL (נפילה בלי Cloudinary) או כל URL אחר - מוחזר כמו שהוא.

const CLD_UPLOAD_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

const variant = (url: string, transform: string): string => {
  const m = CLD_UPLOAD_RE.exec(url);
  if (!m) return url;
  // אם כבר יש טרנספורמציה בכתובת (למשל הוזרקה כבר) - לא כופלים
  if (/^[a-z]_[^/]*\//.test(m[2])) return url;
  return `${m[1]}${transform}/${m[2]}`;
};

// אריח קטן בשורת הרשימה / תצוגה מקדימה (~40-76px, פי ~2 לרינה - מספיק חד
// לגודל הזה, וקטן משמעותית מ-w_216). q_auto:eco - אגרסיבי יותר מ-q_auto
// הרגיל; באריח כזה זעיר אין הבדל נראה לעין אבל המשקל קטן עוד. הפרמטרים
// כאן חייבים להיות זהים ל-eager ב-imageUpload.service.ts (שרת) - אחרת
// ה-eager מייצר גרסה שאף בקשה בפועל לא מבקשת, וזו שכן מבוקשת נוצרת
// "on the fly" בפעם הראשונה בכל זאת.
export const cldThumb = (url: string) => variant(url, 'c_fill,w_160,h_160,f_auto,q_auto:eco');

// תמונת "גיבור" בפרטי מוצר (~300px רוחב)
export const cldPreview = (url: string) => variant(url, 'c_limit,w_720,f_auto,q_auto');

// מסך מלא
export const cldFull = (url: string) => variant(url, 'c_limit,w_1600,f_auto,q_auto');
