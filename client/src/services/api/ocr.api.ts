import apiClient from './client';

export const ocrApi = {
  // image: data URL בסיס64 ("data:image/jpeg;base64,..."). מחזיר את הטקסט הגולמי שזוהה.
  async scanList(image: string): Promise<string> {
    const response = await apiClient.post<{ data: { text: string } }>('/ocr/scan-list', { image });
    return response.data.data.text;
  },
};
