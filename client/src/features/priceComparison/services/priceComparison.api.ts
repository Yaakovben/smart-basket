import apiClient from '../../../services/api/client';
import type { PriceComparisonData } from '../types/priceComparison.types';

export const priceComparisonApi = {
  // תובנות השוואת מחירים — תלוי ב-JWT של המשתמש
  async getComparison(): Promise<PriceComparisonData> {
    const response = await apiClient.get<{ data: PriceComparisonData }>('/price-comparison');
    return response.data.data;
  },
};
