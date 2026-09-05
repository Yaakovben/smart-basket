import apiClient from './client';

export const uploadsApi = {
  // image: data URL בסיס64 דחוס ("data:image/jpeg;base64,..."). השרת מעלה
  // ל-Cloudinary (עם ה-secret) ומחזיר את כתובת ה-https הקבועה.
  // timeout ייעודי 45ש' - קצר מ-60ש' של הלקוח הכללי כדי שמשתמש לא יתקע
  // דקה שלמה על העלאה שנכשלת (Render cold start וכו'); ארוך מספיק גם
  // להעלאה אמיתית של תמונה + מעבר ל-Cloudinary.
  async productImage(image: string): Promise<string> {
    const response = await apiClient.post<{ data: { url: string } }>(
      '/uploads/product-image',
      { image },
      { timeout: 45_000 },
    );
    return response.data.data.url;
  },
};
