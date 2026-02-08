import { ListDAL, ProductDAL } from '../dal';
import { NotFoundError, ForbiddenError } from '../errors';
import { sanitizeText } from '../utils';
import type { CreateProductInput, UpdateProductInput } from '../validators';
import type { IListResponse } from '../types';
import type { IList } from '../models';
import { transformList } from './list-transform.helper';

// Helper to check list access
const checkListAccess = async (
  listId: string,
  userId: string
): Promise<IList> => {
  const list = await ListDAL.findById(listId);

  if (!list) {
    throw NotFoundError.list();
  }

  const isOwner = list.owner.toString() === userId;
  const isMember = list.members.some((m) => m.user.toString() === userId);

  if (!isOwner && !isMember) {
    throw ForbiddenError.noAccess();
  }

  return list;
};

export class ProductService {
  static async addProduct(
    listId: string,
    userId: string,
    data: CreateProductInput
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    await ProductDAL.createProduct({
      listId,
      name: sanitizeText(data.name),
      quantity: data.quantity ?? 1,
      unit: data.unit ?? 'יח׳',
      category: data.category ?? 'אחר',
      addedBy: userId,
    });

    return transformList(list);
  }

  static async updateProduct(
    listId: string,
    productId: string,
    userId: string,
    data: UpdateProductInput
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

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

    return transformList(list);
  }

  static async deleteProduct(
    listId: string,
    productId: string,
    userId: string
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    const product = await ProductDAL.findById(productId);
    if (!product || product.listId.toString() !== listId) {
      throw NotFoundError.product();
    }

    await ProductDAL.deleteProduct(productId);

    return transformList(list);
  }

  static async togglePurchased(
    listId: string,
    productId: string,
    userId: string
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    const product = await ProductDAL.findById(productId);
    if (!product || product.listId.toString() !== listId) {
      throw NotFoundError.product();
    }

    await ProductDAL.togglePurchased(productId);

    return transformList(list);
  }

  static async reorderProducts(
    listId: string,
    userId: string,
    productIds: string[]
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    await ProductDAL.reorderProducts(listId, productIds);

    return transformList(list);
  }
}
