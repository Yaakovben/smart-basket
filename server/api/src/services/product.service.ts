import { ProductDAL } from '../dal';
import { NotFoundError } from '../errors';
import { sanitizeText } from '../utils';
import type { CreateProductInput, UpdateProductInput } from '../validators';
import type { IProductDoc } from '../models';
import { checkListAccess } from './list-access.helper';

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
