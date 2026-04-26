import type { ChainId } from '../models/Price.model';

export interface ChainPriceItem {
  barcode: string;
  itemName: string;
  price: number;
  unitOfMeasure?: string;
  manufacturerName?: string;
  quantity?: number;
  storeId?: string;
}

export interface ChainFetchResult {
  chainId: ChainId;
  chainName: string;
  items: ChainPriceItem[];
  fetchedFiles: number;
  error?: string;
}

// פריט מקובץ Stores*.xml של רשת - המקור הרשמי לסניפים של הרשת
export interface ChainStoreItem {
  storeId: string;
  storeName: string;
  address?: string;
  city?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
}

export interface ChainStoresFetchResult {
  chainId: ChainId;
  chainName: string;
  stores: ChainStoreItem[];
  fetchedFiles: number;
  error?: string;
}

export interface ChainAdapter {
  readonly chainId: ChainId;
  readonly chainName: string;
  fetchLatestPrices(): Promise<ChainFetchResult>;
  // אופציונלי: מביא את רשימת הסניפים הרשמית של הרשת מהפורטל.
  // רשתות שלא מפרסמות Stores*.xml - לא יממשו או יחזירו ריק.
  fetchLatestStores?(): Promise<ChainStoresFetchResult>;
}
