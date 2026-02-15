import type { ProductData } from '../types';

export const isValidString = (val: unknown): val is string =>
  typeof val === 'string' && val.length > 0 && val.length < 500;

export const isValidBoolean = (val: unknown): val is boolean => typeof val === 'boolean';

export const isValidProduct = (product: unknown): product is ProductData => {
  if (product === null || typeof product !== 'object') return false;
  const p = product as ProductData;
  if (!isValidString(p.name)) return false;
  if (p.quantity !== undefined && (typeof p.quantity !== 'number' || p.quantity < 0)) return false;
  if (p.unit !== undefined && typeof p.unit !== 'string') return false;
  if (p.category !== undefined && typeof p.category !== 'string') return false;
  return true;
};
