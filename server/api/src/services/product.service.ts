import mongoose from 'mongoose';
import { List, type IProduct } from '../models';
import { ApiError } from '../utils';
import type { CreateProductInput, UpdateProductInput } from '../utils/validators';
import type { IListResponse } from '../types';

// Helper to check list access
const checkListAccess = async (
  listId: string,
  userId: string
): Promise<typeof List.prototype> => {
  const list = await List.findById(listId);

  if (!list) {
    throw ApiError.notFound('List not found');
  }

  const hasAccess =
    list.owner.toString() === userId ||
    list.members.some((m) => m.user.toString() === userId);

  if (!hasAccess) {
    throw ApiError.forbidden('You do not have access to this list');
  }

  return list;
};

// Helper to check if a string looks like a MongoDB ObjectId
const isObjectIdString = (str: string): boolean => {
  return /^[a-f\d]{24}$/i.test(str);
};

// Helper to convert addedBy from object/ObjectId to string (name)
const convertProductsAddedBy = (products: Record<string, unknown>[]): Record<string, unknown>[] => {
  return products.map((p) => {
    let addedByName: string;

    if (typeof p.addedBy === 'object' && p.addedBy !== null) {
      // Populated user object - extract name
      addedByName = (p.addedBy as { name?: string }).name || 'Unknown';
    } else if (typeof p.addedBy === 'string') {
      // If it's a string that looks like an ObjectId, use 'Unknown'
      // Otherwise, assume it's already a name
      addedByName = isObjectIdString(p.addedBy) ? 'Unknown' : p.addedBy;
    } else {
      addedByName = 'Unknown';
    }

    return { ...p, addedBy: addedByName };
  });
};

// Helper to transform list
const transformList = async (list: typeof List.prototype): Promise<IListResponse> => {
  await list.populate('owner', 'name email avatarColor avatarEmoji isAdmin');
  await list.populate('members.user', 'name email avatarColor avatarEmoji');
  await list.populate('products.addedBy', 'name');

  const json = list.toJSON() as Record<string, unknown>;

  // Convert products.addedBy from object to string (just the name)
  if (json.products && Array.isArray(json.products)) {
    json.products = convertProductsAddedBy(json.products as Record<string, unknown>[]);
  }

  return json as unknown as IListResponse;
};

export class ProductService {
  static async addProduct(
    listId: string,
    userId: string,
    data: CreateProductInput
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    list.products.push({
      _id: new mongoose.Types.ObjectId(),
      ...data,
      isPurchased: false,
      addedBy: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
    });

    await list.save();

    return transformList(list);
  }

  static async updateProduct(
    listId: string,
    productId: string,
    userId: string,
    data: UpdateProductInput
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    const product = list.products.find(
      (p: IProduct) => p._id.toString() === productId
    );

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Update product fields
    if (data.name !== undefined) product.name = data.name;
    if (data.quantity !== undefined) product.quantity = data.quantity;
    if (data.unit !== undefined) product.unit = data.unit;
    if (data.category !== undefined) product.category = data.category;
    if (data.isPurchased !== undefined) product.isPurchased = data.isPurchased;

    await list.save();

    return transformList(list);
  }

  static async deleteProduct(
    listId: string,
    productId: string,
    userId: string
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    const productIndex = list.products.findIndex(
      (p: IProduct) => p._id.toString() === productId
    );

    if (productIndex === -1) {
      throw ApiError.notFound('Product not found');
    }

    list.products.splice(productIndex, 1);
    await list.save();

    return transformList(list);
  }

  static async togglePurchased(
    listId: string,
    productId: string,
    userId: string
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    const product = list.products.find(
      (p: IProduct) => p._id.toString() === productId
    );

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    product.isPurchased = !product.isPurchased;
    await list.save();

    return transformList(list);
  }

  static async reorderProducts(
    listId: string,
    userId: string,
    productIds: string[]
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    // Create a map of products by ID
    const productMap = new Map(
      list.products.map((p: IProduct) => [p._id.toString(), p])
    );

    // Reorder products based on provided order
    const reorderedProducts = productIds
      .map((id) => productMap.get(id))
      .filter((p): p is IProduct => p !== undefined);

    // Add any products that weren't in the provided order
    list.products.forEach((p: IProduct) => {
      if (!productIds.includes(p._id.toString())) {
        reorderedProducts.push(p);
      }
    });

    list.products = reorderedProducts;
    await list.save();

    return transformList(list);
  }
}
