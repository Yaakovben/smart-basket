import apiClient from './client';

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  eager: string;
}

export const uploadsApi = {
  // חתימה חד-פעמית להעלאה ישירה של הלקוח ל-Cloudinary (ראו imageUpload.ts).
  // בייטי התמונה עצמם לא עוברים דרך השרת שלנו בכלל - רק הבקשה הקטנה הזו.
  async signature(): Promise<UploadSignature> {
    const response = await apiClient.get<{ data: UploadSignature }>('/uploads/signature');
    return response.data.data;
  },

  // image: Blob/File באיכות גבוהה (המאסטר - ראו imageUpload.ts). מעלה
  // ישירות ל-Cloudinary עם חתימה מהשרת (השרת אף פעם לא רואה/מעביר את
  // בייטי התמונה - חוסך מעבר כפול לקוח->שרת->Cloudinary, מורגש בעיקר
  // ברשתות איטיות). Cloudinary גוזר מהמאסטר את כל הגרסאות עם q_auto.
  //
  // AbortController עם timeout - ל-fetch הגולמי הזה (בניגוד ל-apiClient
  // הרגיל) אין שום timeout מובנה, ובניגוד ל-axios אין לו גם ברירת מחדל.
  // ברשת סלולרית חלשה/לא יציבה הבקשה יכולה פשוט "להיתקע" (לא מצליחה
  // ולא נכשלת) - בלי timeout כאן, ה-await הזה לא היה נגמר לעולם, מה
  // שהשאיר את חיווי ה"מים עולים" ב-ProductImageField דולק בלי סוף (עוד
  // *לפני* שהקוד מגיע בכלל לחלק שכבר יש לו timeout - preload ה-thumb).
  async productImage(image: Blob): Promise<string> {
    const sig = await this.signature();
    const form = new FormData();
    form.append('file', image, image instanceof File ? image.name : 'product.jpg');
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    form.append('eager', sig.eager);
    form.append('eager_async', 'true');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    let res: Response;
    try {
      res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) throw new Error('Cloudinary upload timed out');
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Cloudinary upload failed');
    }
    return data.secure_url as string;
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
