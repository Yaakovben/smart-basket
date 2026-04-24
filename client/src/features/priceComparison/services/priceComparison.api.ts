import apiClient from '../../../services/api/client';
import type { PriceComparisonData } from '../types/priceComparison.types';

export interface PriceChainStatus {
  chainId: string;
  chainName: string;
  count: number;
  lastSyncError?: string | null;
  lastSyncAt?: string | null;
  lastSyncFetched?: number | null;
  // סניפים סונכרנו - כמות כוללת וכמות עם קואורדינטות תקפות (לאחר geocoding)
  branchCount?: number;
  branchesWithCoords?: number;
}

export interface PriceSyncProgress {
  active: boolean;
  currentIndex: number;
  currentChainName: string;
  totalChains: number;
  completedChains: number;
  startedAt: string | null;
}

export interface PriceSyncStatus {
  syncInProgress: boolean;
  syncProgress?: PriceSyncProgress;
  lastUpdatedISO: string | null;
  ageHours: number | null;
  chains: PriceChainStatus[];
  totalPrices: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export const priceComparisonApi = {
  // תובנות השוואת מחירים — תלוי ב-JWT של המשתמש.
  // listId אופציונלי: אם מועבר, ההשוואה מצומצמת לרשימה הזו בלבד.
  // location אופציונלי: אם מועבר, כל רשת תקבל nearestBranch עם מרחק.
  async getComparison(listId?: string, location?: UserLocation): Promise<PriceComparisonData> {
    const params = new URLSearchParams();
    if (listId) params.set('listId', listId);
    if (location) {
      params.set('lat', String(location.lat));
      params.set('lng', String(location.lng));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<{ data: PriceComparisonData }>(`/price-comparison${query}`);
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
