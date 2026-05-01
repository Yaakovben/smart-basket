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

  // רשימת סניפים מפורטת של רשת - לעמוד האדמין
  async getBranchesByChain(chainId: string): Promise<{
    success: boolean;
    chainId: string;
    count: number;
    branches: Array<{
      id: string;
      storeId: string;
      storeName: string;
      city: string;
      address: string;
      lat?: number;
      lng?: number;
      hasCoords: boolean;
      coordSource: 'portal' | 'geocoded' | 'unknown';
    }>;
  }> {
    const response = await apiClient.get(`/price-comparison/branches/${chainId}`);
    return response.data;
  },

  // הוספה המונית של סניפים מאומתים
  async bulkAddBranches(branches: Array<{ chainId: string; storeName: string; city?: string; address?: string; lat: number; lng: number }>): Promise<{
    success: boolean; message?: string; success_count?: number; failed_count?: number; errors?: string[];
  }> {
    try {
      const r = await apiClient.post('/price-comparison/branches/bulk', { branches });
      return r.data;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      return { success: false, message: e.response?.data?.message || e.message };
    }
  },

  // השלמת כתובות חסרות (reverse geocoding דרך Nominatim, עד 50 לריצה)
  async fillMissingAddresses(): Promise<{ success: boolean; message?: string; updated?: number; checked?: number }> {
    try {
      const r = await apiClient.post('/price-comparison/branches/fill-addresses', null, { timeout: 90_000 });
      return r.data;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      return { success: false, message: e.response?.data?.message || e.message };
    }
  },

  // מחיקת סניפים לא-מאומתים (כל מה שאינו OSM או הוספה ידנית)
  async cleanupUnverifiedBranches(): Promise<{ success: boolean; message?: string; deletedCount?: number }> {
    try {
      const r = await apiClient.post('/price-comparison/branches/cleanup');
      return r.data;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      return { success: false, message: e.response?.data?.message || e.message };
    }
  },

  // יצירה/עדכון סניף ידני
  async upsertBranch(data: { chainId: string; storeName: string; address?: string; city?: string; lat: number; lng: number; storeId?: string }): Promise<{ success: boolean; storeId?: string; message?: string }> {
    try {
      const r = await apiClient.post('/price-comparison/branches', data);
      return r.data;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      return { success: false, message: e.response?.data?.message || e.message };
    }
  },

  // מחיקת סניף
  async deleteBranch(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const r = await apiClient.delete(`/price-comparison/branches/${id}`);
      return r.data;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      return { success: false, message: e.response?.data?.message || e.message };
    }
  },

  // טעינה מיידית של seed הסניפים המוכרים (65 סניפים) - עובד תמיד, לא תלוי בכלום
  async loadSeed(): Promise<{ success: boolean; message: string; upserted?: number; total?: number }> {
    try {
      const response = await apiClient.post('/price-comparison/load-seed', null, { timeout: 30_000 });
      return response.data;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      return { success: false, message: e.response?.data?.message || e.message || 'שגיאה' };
    }
  },

  // בדיקה דיאגנוסטית של OSM - בודק 4 endpoints במקביל ב-5 שניות כל אחד
  async testOsm(): Promise<{
    success: boolean;
    workingEndpoints?: number;
    totalEndpoints?: number;
    summary?: string;
    results?: Array<{
      endpoint: string;
      ok: boolean;
      elapsedMs: number;
      status?: number;
      elements?: number;
      error?: string;
      code?: string;
      httpStatus?: number;
    }>;
    error?: string;
  }> {
    try {
      const response = await apiClient.get('/price-comparison/test-osm', { timeout: 28_000 });
      return response.data;
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      return {
        success: false,
        summary: e.response?.data?.error || e.message || 'unknown',
      };
    }
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

  // דוח אימות נתונים - סניפים, מחירים ו-sync לכל הרשתות.
  async getDataQuality(): Promise<DataQualityReport> {
    const response = await apiClient.get('/price-comparison/data-quality');
    return response.data.data;
  },
};

export interface BranchIssue {
  id: string;
  chainId: string;
  storeId: string;
  storeName: string;
  city?: string;
  reasons: string[];
}

export interface PriceIssue {
  barcode: string;
  chainId: string;
  itemName: string;
  price: number;
  reason: string;
}

export interface ChainSyncStat {
  chainId: string;
  chainName: string;
  totalPrices: number;
  totalBranches: number;
  oldestPriceAt: string | null;
  newestPriceAt: string | null;
  freshnessHours: number | null;
  lastSyncResult: {
    fetched: number;
    upserted: number;
    error?: string;
    storesError?: string;
    elapsedMs: number;
    completedAt: string;
  } | null;
}

export interface DataQualityReport {
  generatedAt: string;
  branches: {
    total: number;
    issues: BranchIssue[];
    stats: { withoutCoords: number; outOfBounds: number; withoutCity: number };
  };
  prices: {
    total: number;
    issues: PriceIssue[];
    stats: { zeroOrNegative: number; tooHigh: number; stale: number };
  };
  sync: ChainSyncStat[];
}
