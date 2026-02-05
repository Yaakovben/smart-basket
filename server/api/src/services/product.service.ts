import mongoose from 'mongoose';
import { type IProduct, type IList } from '../models';
import { ListDAL } from '../dal';
import { NotFoundError, ForbiddenError } from '../errors';
import { sanitizeText, convertProductsAddedBy } from '../utils';
import type { CreateProductInput, UpdateProductInput } from '../validators';
import type { IListResponse } from '../types';

// Helper to check list access
const checkListAccess = async (
  listId: string,
  userId: string
): Promise<IList> => {
  const list = await ListDAL.findById(listId);

  if (!list) {
    throw NotFoundError.list();
  }

  const hasAccess = await ListDAL.isMember(listId, userId);

  if (!hasAccess) {
    throw ForbiddenError.noAccess();
  }

  return list;
};

// Helper to transform list
const transformList = async (list: IList): Promise<IListResponse> => {
  // Run all populate queries in parallel for better performance
  await Promise.all([
    list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
    list.populate('members.user', 'name email avatarColor avatarEmoji'),
    list.populate('products.addedBy', 'name'),
  ]);

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
      name: sanitizeText(data.name), // Sanitize product name
      isPurchased: false,
      addedBy: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
    } as IProduct);

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
      throw NotFoundError.product();
    }

    // Update product fields
    if (data.name !== undefined) product.name = sanitizeText(data.name);
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
      throw NotFoundError.product();
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
      throw NotFoundError.product();
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
