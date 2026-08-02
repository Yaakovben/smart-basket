import type { Product } from './lists.types';

export interface CreateProductData {
  name: string;
  quantity?: number;
  unit?: Product['unit'];
  category?: Product['category'];
}

export interface UpdateProductData {
  name?: string;
  quantity?: number;
  unit?: Product['unit'];
  category?: Product['category'];
  isPurchased?: boolean;
  note?: string;
}

// תגובת מוצר בודד מה-API (addProduct)
export interface ApiProductResponse {
  id: string;
  name: string;
  quantity: number;
  unit: Product['unit'];
  category: Product['category'];
  isPurchased: boolean;
  addedBy: string;
  updatedBy?: string | null;
  purchasedBy?: string | null;
  createdAt: string;
  note?: string;
}
