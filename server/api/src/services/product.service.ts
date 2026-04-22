import { ProductDAL, ListDAL } from '../dal';
import { NotFoundError } from '../errors';
import { sanitizeText } from '../utils';
import type { CreateProductInput, UpdateProductInput } from '../validators';
import type { IProductDoc } from '../models';
import { checkListAccess } from './list-access.helper';
import { PriceComparisonService } from '../features/priceComparison';

// המרת מוצר Mongoose לאובייקט תגובת API
const toProductResponse = (product: IProductDoc) => {
  const json = product.toJSON() as Record<string, unknown>;
  if (json.addedBy && typeof json.addedBy === 'object') {
    json.addedBy = (json.addedBy as { name?: string }).name || 'Unknown';
  }
  return json;
};

export class ProductService {
  static async addProduct(
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
    });

    // עדכון זמן שינוי הרשימה (מוצרים בקולקשן נפרד)
    await ListDAL.touchUpdatedAt(listId);

    // אינולידציית מטמון השוואת מחירים של המשתמש - שינוי פריטים משפיע על הסה"כ
    PriceComparisonService.invalidateUser(userId);

    return toProductResponse(product);
  }

  static async updateProduct(
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

    await ProductDAL.updateProduct(productId, updates);

    // עדכון זמן שינוי הרשימה
    await ListDAL.touchUpdatedAt(listId);
    PriceComparisonService.invalidateUser(userId);
  }

  static async deleteProduct(
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

    // עדכון זמן שינוי הרשימה
    await ListDAL.touchUpdatedAt(listId);
    PriceComparisonService.invalidateUser(userId);
  }

  static async clearProducts(
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
    PriceComparisonService.invalidateUser(userId);
    return deletedCount;
  }

  // איפוס כל המוצרים ל"לא נקנה" (רשימה קבועה)
  static async resetProducts(
    listId: string,
    userId: string
  ): Promise<number> {
    await checkListAccess(listId, userId);
    const count = await ProductDAL.resetAll(listId);
    await ListDAL.touchUpdatedAt(listId);
    PriceComparisonService.invalidateUser(userId);
    return count;
  }

  static async reorderProducts(
    listId: string,
    userId: string,
    productIds: string[]
  ): Promise<void> {
    await checkListAccess(listId, userId);

    await ProductDAL.reorderProducts(listId, productIds);
  }
}
