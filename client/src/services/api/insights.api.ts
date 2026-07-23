import apiClient from './client';
import type { InsightsData } from './types/insights.types';

// השוואת מחירים הועברה למודול נפרד: src/features/priceComparison

export const insightsApi = {
  async getInsights(): Promise<InsightsData> {
    const response = await apiClient.get<{ data: InsightsData }>('/insights');
    return response.data.data;
  },
};
