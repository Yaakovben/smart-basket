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
  // שגיאת סנכרון סניפים (נפרד משגיאת מחירים) - כשלא הצלחנו למשוך קובץ Stores
  storesError?: string | null;
  storesFetched?: number | null;
}

export interface PriceSyncProgress {
  active: boolean;
  currentIndex: number;
  currentChainName: string;
  totalChains: number;
  completedChains: number;
  startedAt: string | null;
}

export interface BranchSyncState {
  active: boolean;
  startedAt: string | null;
  completedAt: string | null;
  totalFetched: number;
  totalUpserted: number;
  error: string | null;
}

export interface PriceSyncStatus {
  syncInProgress: boolean;
  syncProgress?: PriceSyncProgress;
  branchSync?: BranchSyncState;
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

  // סנכרון סניפים מ-OpenStreetMap. סינכרוני - הקריאה ממתינה עד הסיום (40-60 שניות).
  async refreshBranches(): Promise<{
    success: boolean;
    message: string;
    totalFetched?: number;
    totalUpserted?: number;
    results?: Array<{ chainId: string; chainName: string; fetched: number; upserted: number }>;
  }> {
    const response = await apiClient.post('/price-comparison/refresh-branches', null, {
      timeout: 120_000, // עד 2 דקות - לתת מרווח
    });
    return response.data;
  },
};
