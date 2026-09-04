import apiClient from './client';

export const uploadsApi = {
  // image: data URL בסיס64 דחוס ("data:image/jpeg;base64,..."). השרת מעלה
  // ל-Cloudinary (עם ה-secret) ומחזיר את כתובת ה-https הקבועה.
  async productImage(image: string): Promise<string> {
    const response = await apiClient.post<{ data: { url: string } }>('/uploads/product-image', { image });
    return response.data.data.url;
  },
};
