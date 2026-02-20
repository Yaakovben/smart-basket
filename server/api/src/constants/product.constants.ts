// מקור אמת יחיד ליחידות וקטגוריות מוצרים
export const PRODUCT_UNITS = ['יח׳', 'ק״ג', 'גרם', 'ליטר'] as const;

export const PRODUCT_CATEGORIES = [
  'מוצרי חלב',
  'מאפים',
  'ירקות',
  'פירות',
  'בשר',
  'משקאות',
  'ממתקים',
  'ניקיון',
  'אחר',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const DEFAULT_UNIT: ProductUnit = 'יח׳';
export const DEFAULT_CATEGORY: ProductCategory = 'אחר';
