// טיפוסים למסך ניהול מאגר המחירים (PriceSyncManager) ותתי-הרכיבים שלו.

import type { priceComparisonApi } from '../../priceComparison';

// סניף בודד כפי שמוחזר מ-getBranchesByChain
export type ChainBranch = Awaited<ReturnType<typeof priceComparisonApi.getBranchesByChain>>['branches'][number];

// טופס הוספת/עריכת סניף ידני - כל השדות טקסטואליים (lat/lng מפוענחים לפני שליחה)
export interface NewBranchForm {
  storeName: string;
  city: string;
  address: string;
  lat: string;
  lng: string;
}

export interface SyncFeedback {
  msg: string;
  tone: 'info' | 'error';
}

export type ChainStatusFilterValue = 'all' | 'errors' | 'no_branches' | 'no_prices';
