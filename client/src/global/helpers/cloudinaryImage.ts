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

// אריח קטן בשורת הרשימה / בטופס (~38-80px CSS). w_256 מכסה תצוגה של עד
// ~85px במסך פי-3 (רינה) - w_160 הקודם היה קטן מדי לזה ונראה מטושטש.
// q_auto (לא :eco - :eco היה אגרסיבי מדי וריכך את האריח). הפרמטרים כאן
// חייבים להיות זהים ל-eager ב-imageUpload.service.ts (שרת) - אחרת ה-eager
// מייצר גרסה שאף בקשה לא מבקשת, וזו שכן מבוקשת נוצרת "on the fly" בכל זאת.
export const cldThumb = (url: string) => variant(url, 'c_fill,w_256,h_256,f_auto,q_auto');

// תמונת "גיבור" בפרטי מוצר (~150-300px CSS, מכסה גם רינה פי-3). q_auto:best
// (לא q_auto הרגיל) - כאן המשתמש באמת מסתכל מקרוב, איכות עדיפה על גודל קובץ.
export const cldPreview = (url: string) => variant(url, 'c_limit,w_800,f_auto,q_auto:best');

// מסך מלא - אותו היגיון כמו cldPreview, q_auto:best.
export const cldFull = (url: string) => variant(url, 'c_limit,w_1600,f_auto,q_auto:best');

// ===== blur-up placeholder =====
// גרסה זעירה ומטושטשת (32x32, q_1) - נטענת כמעט מיידית (כמה מאות בייטים)
// ומוצגת עד שהגרסה החדה נטענת, כדי שהתמונה "מוצגת" כבר מהרגע הראשון
// במקום ריבוע ריק שמחכה לרשת. ראו ProgressiveImage. data URL (נפילה בלי
// Cloudinary, כבר בזיכרון) לא צריך בלור - undefined.
export const cldBlur = (url: string): string | undefined =>
  CLD_UPLOAD_RE.test(url) ? variant(url, 'c_fill,w_32,h_32,e_blur:1000,q_1,f_auto') : undefined;
