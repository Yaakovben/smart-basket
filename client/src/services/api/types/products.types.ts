import type { Product } from './lists.types';

export interface CreateProductData {
  name: string;
  quantity?: number;
  unit?: Product['unit'];
  category?: Product['category'];
  note?: string;
  // מזהה שנוצר בצד לקוח (temp id) - מאפשר לשרת לזהות ניסיון חוזר של אותה
  // הוספה (למשל אחרי שתשובת השרת אבדה ברשת) ולהחזיר את המוצר הקיים במקום
  // ליצור כפילות. ראו product.service.ts:addProduct.
  clientId?: string;
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
