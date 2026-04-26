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

export interface ChainAdapter {
  readonly chainId: ChainId;
  readonly chainName: string;
  fetchLatestPrices(): Promise<ChainFetchResult>;
}
