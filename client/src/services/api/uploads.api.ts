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

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
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
