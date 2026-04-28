import { ProductDAL, ListDAL } from '../dal';
import { NotFoundError } from '../errors';
import { sanitizeText } from '../utils';
import type { CreateProductInput, UpdateProductInput } from '../validators';
import type { IProductDoc } from '../models';
import { checkListAccess } from './list-access.helper';
import { invalidateUser as invalidatePriceCacheForUser } from '../features/priceComparison';

// המרת מוצר Mongoose לאובייקט תגובת API
const toProductResponse = (product: IProductDoc) => {
  const json = product.toJSON() as Record<string, unknown>;
  if (json.addedBy && typeof json.addedBy === 'object') {
    json.addedBy = (json.addedBy as { name?: string }).name || 'Unknown';
  }
  return json;
};

export async function addProduct(
  listId: string,
  userId: string,
  data: CreateProductInput
) {
  await checkListAccess(listId, userId);

  const product = await ProductDAL.createProduct({
    listId,
    name: sanitizeText(data.name),
    quantity: data.quantity ?? 1,
    unit: data.unit ?? 'יח׳',
    category: data.category ?? 'אחר',
    addedBy: userId,
    ...(data.note !== undefined ? { note: sanitizeText(data.note) } : {}),
    ...(data.barcode ? { barcode: data.barcode.trim() } : {}),
  });

  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);

  return toProductResponse(product);
}

export async function updateProduct(
  listId: string,
  productId: string,
  userId: string,
  data: UpdateProductInput
): Promise<void> {
  await checkListAccess(listId, userId);

  const product = await ProductDAL.findById(productId);
  if (!product || product.listId.toString() !== listId) {
    throw NotFoundError.product();
  }

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = sanitizeText(data.name);
  if (data.quantity !== undefined) updates.quantity = data.quantity;
  if (data.unit !== undefined) updates.unit = data.unit;
  if (data.category !== undefined) updates.category = data.category;
  if (data.isPurchased !== undefined) updates.isPurchased = data.isPurchased;
  if (data.note !== undefined) updates.note = sanitizeText(data.note);
  if (data.barcode !== undefined) updates.barcode = data.barcode.trim() || undefined;

  await ProductDAL.updateProduct(productId, updates);
  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);
}

export async function deleteProduct(
  listId: string,
  productId: string,
  userId: string
): Promise<void> {
  await checkListAccess(listId, userId);

  const product = await ProductDAL.findById(productId);
  if (!product || product.listId.toString() !== listId) {
    throw NotFoundError.product();
  }

  await ProductDAL.deleteProduct(productId);
  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);
}

export async function clearProducts(
  listId: string,
  userId: string,
  filter: 'all' | 'purchased' | 'pending'
): Promise<number> {
  await checkListAccess(listId, userId);

  let deletedCount: number;
  if (filter === 'purchased') {
    deletedCount = await ProductDAL.clearPurchased(listId);
  } else if (filter === 'pending') {
    deletedCount = await ProductDAL.clearPending(listId);
  } else {
    deletedCount = await ProductDAL.clearAll(listId);
  }
  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);
  return deletedCount;
}

// איפוס כל המוצרים ל"לא נקנה" (רשימה קבועה)
export async function resetProducts(
  listId: string,
  userId: string
): Promise<number> {
  await checkListAccess(listId, userId);
  const count = await ProductDAL.resetAll(listId);
  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);
  return count;
}

export async function reorderProducts(
  listId: string,
  userId: string,
  productIds: string[]
): Promise<void> {
  await checkListAccess(listId, userId);
  await ProductDAL.reorderProducts(listId, productIds);
}
