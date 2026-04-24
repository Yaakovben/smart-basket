import apiClient from '../../../services/api/client';
import type { PriceComparisonData } from '../types/priceComparison.types';

export interface PriceChainStatus {
  chainId: string;
  chainName: string;
  count: number;
}

export interface PriceSyncStatus {
  syncInProgress: boolean;
  lastUpdatedISO: string | null;
  ageHours: number | null;
  chains: PriceChainStatus[];
  totalPrices: number;
}

export const priceComparisonApi = {
  // תובנות השוואת מחירים — תלוי ב-JWT של המשתמש
  async getComparison(): Promise<PriceComparisonData> {
    const response = await apiClient.get<{ data: PriceComparisonData }>('/price-comparison');
    return response.data.data;
  },

  // ----- Admin only: ניהול המאגר -----
  async getStatus(): Promise<PriceSyncStatus> {
    const response = await apiClient.get<{ data: PriceSyncStatus }>('/price-comparison/status');
    return response.data.data;
  },

  async refresh(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/price-comparison/refresh');
    return response.data;
  },
};
