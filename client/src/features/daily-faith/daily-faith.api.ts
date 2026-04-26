import apiClient from '../../services/api/client';

export interface DailyFaith {
  id: string;
  text: string;
  createdAt: string;
}

export const dailyFaithApi = {
  async getRandom(): Promise<DailyFaith | null> {
    const response = await apiClient.get<{ data: DailyFaith | null }>('/daily-faith/random');
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
