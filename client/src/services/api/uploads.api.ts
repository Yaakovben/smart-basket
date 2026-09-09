import apiClient from './client';

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  eager: string;
}

// ===== מטמון חתימת העלאה (prefetch) =====
// signature() נקראה עד כה רק בתוך handleFile, *אחרי* שהמשתמש בחר קובץ -
// ואם ה-API של Render בקור start, זו המתנה של 30-50 שניות בדיוק ברגע
// שהמשתמש מצפה שהתמונה תתחיל לעלות. חתימת Cloudinary תקפה ~שעה, אז אפשר
// להביא אותה מראש (בפתיחת המודל) ולשמור במטמון מודול קצר-מועד. שמרני:
// 10 דק' בלבד (הרבה פחות מהשעה) כדי לא להסתכן בחתימה שפגה.
const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000;
let signatureCache: { value: UploadSignature; at: number } | null = null;
let signatureInFlight: Promise<UploadSignature> | null = null;

function fetchSignature(): Promise<UploadSignature> {
  return apiClient
    .get<{ data: UploadSignature }>('/uploads/signature')
    .then((response) => response.data.data);
}

export const uploadsApi = {
  // חתימה חד-פעמית להעלאה ישירה של הלקוח ל-Cloudinary (ראו imageUpload.ts).
  // בייטי התמונה עצמם לא עוברים דרך השרת שלנו בכלל - רק הבקשה הקטנה הזו.
  // מחזירה מהמטמון אם יש חתימה טרייה (prefetch), אחרת מביאה עכשיו. קריאה
  // מקבילית שנייה בזמן שהראשונה עוד בדרך מקבלת את אותו promise.
  async signature(): Promise<UploadSignature> {
    if (signatureCache && Date.now() - signatureCache.at < SIGNATURE_MAX_AGE_MS) {
      return signatureCache.value;
    }
    if (signatureInFlight) return signatureInFlight;
    signatureInFlight = fetchSignature()
      .then((value) => {
        signatureCache = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        signatureInFlight = null;
      });
    return signatureInFlight;
  },

  // נקרא בפתיחת שדה התמונה (ProductImageField mount) - מחמם את החתימה כדי
  // שבחירת הקובץ בפועל לא תמתין ל-round-trip. best-effort לגמרי: כשל כאן
  // נבלע, signature() תנסה שוב כרגיל כשההעלאה האמיתית תתחיל.
  prefetchUploadSignature(): void {
    if (signatureCache && Date.now() - signatureCache.at < SIGNATURE_MAX_AGE_MS) return;
    if (signatureInFlight) return;
    void this.signature().catch(() => { /* prefetch - לא קריטי */ });
  },

  // image: Blob/File באיכות גבוהה (המאסטר - ראו imageUpload.ts). מעלה
  // ישירות ל-Cloudinary עם חתימה מהשרת (השרת אף פעם לא רואה/מעביר את
  // בייטי התמונה - חוסך מעבר כפול לקוח->שרת->Cloudinary, מורגש בעיקר
  // ברשתות איטיות). Cloudinary בונה מהמאסטר את גרסת ה-thumb סינכרונית
  // (eager בלי eager_async - ראו imageUpload.service.ts); שאר הגרסאות
  // נוצרות on-the-fly בבקשה הראשונה.
  //
  // XMLHttpRequest (לא fetch) - רק כך יש אירועי התקדמות העלאה אמיתיים
  // (xhr.upload.onprogress) לחיווי ה"מים העולים". xhr.timeout=45s מחליף
  // את ה-AbortController שהיה על ה-fetch: ברשת סלולרית לא יציבה הבקשה
  // יכולה "להיתקע" בלי להצליח/להיכשל, ובלי timeout ה-Promise הזה לא היה
  // נפתר לעולם (חיווי ההעלאה היה דולק בלי סוף).
  productImage(image: Blob, onProgress?: (pct: number) => void): Promise<string> {
    return this.signature().then((sig) => {
      const form = new FormData();
      form.append('file', image, image instanceof File ? image.name : 'product.jpg');
      form.append('api_key', sig.apiKey);
      form.append('timestamp', String(sig.timestamp));
      form.append('signature', sig.signature);
      form.append('folder', sig.folder);
      form.append('eager', sig.eager);

      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`);
        xhr.timeout = 45000;
        xhr.upload.onprogress = (e) => {
          if (onProgress && e.lengthComputable) {
            onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
          }
        };
        xhr.onload = () => {
          let data: { secure_url?: string; error?: { message?: string } } | null = null;
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            /* גוף לא-JSON - ניפול ל-error הגנרי למטה */
          }
          if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) {
            resolve(data.secure_url);
          } else {
            reject(new Error(data?.error?.message || 'Cloudinary upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Cloudinary upload failed'));
        xhr.ontimeout = () => reject(new Error('Cloudinary upload timed out'));
        xhr.send(form);
      });
    });
  },

  // ביטול העלאה שלא נוצלה - נבחרה תמונה בטופס "הוסף מוצר" (עלתה מיד
  // ל-Cloudinary), ואז בוטלה/הוחלפה/נסגר המודל בלי לשמור. השרת מוחק *רק*
  // אם התמונה יתומה (שום מוצר לא מפנה אליה) - ראו POST /uploads/discard.
  // best-effort: כשל כאן אף פעם לא מוצג למשתמש, סריקת האדמין תתפוס בסוף.
  async discardImage(url: string): Promise<void> {
    try {
      await apiClient.post('/uploads/discard', { url });
    } catch { /* best-effort ניקוי, לא קריטי */ }
  },
};
