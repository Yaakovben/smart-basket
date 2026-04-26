import apiClient from '../../services/api/client';

export interface DailyFaith {
  id: string;
  text: string;
  createdAt: string;
}

export const dailyFaithApi = {
  // excludeIds: מזהי ציטוטים שהלקוח כבר ראה - השרת ישתדל לא להחזיר אותם
  async getRandom(excludeIds: string[] = []): Promise<DailyFaith | null> {
    const query = excludeIds.length > 0 ? `?exclude=${excludeIds.join(',')}` : '';
    const response = await apiClient.get<{ data: DailyFaith | null }>(`/daily-faith/random${query}`);
    return response.data.data;
  },
  async getAll(): Promise<DailyFaith[]> {
    const response = await apiClient.get<{ data: DailyFaith[] }>('/daily-faith');
    return response.data.data;
  },
  async create(text: string): Promise<DailyFaith> {
    const response = await apiClient.post<{ data: DailyFaith }>('/daily-faith', { text });
    return response.data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/daily-faith/${id}`);
  },
};
