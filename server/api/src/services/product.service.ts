import { ListDAL, ProductDAL } from '../dal';
import { NotFoundError, ForbiddenError } from '../errors';
import { sanitizeText } from '../utils';
import type { CreateProductInput, UpdateProductInput } from '../validators';
import type { IListResponse } from '../types';
import type { IList } from '../models';

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

// Helper to transform list with products from separate collection
const transformListWithProducts = async (list: IList): Promise<IListResponse> => {
  // Populate list fields
  await Promise.all([
    list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
    list.populate('members.user', 'name email avatarColor avatarEmoji'),
  ]);

  // Fetch products separately from Product collection
  const products = await ProductDAL.findByListId(list._id.toString());

  const json = list.toJSON() as Record<string, unknown>;

  // Add products to the response (transform addedBy to just the name string)
  json.products = products.map((p) => {
    const pJson = p.toJSON() as Record<string, unknown>;
    if (pJson.addedBy && typeof pJson.addedBy === 'object') {
      pJson.addedBy = (pJson.addedBy as { name?: string }).name || 'Unknown';
    }
    return pJson;
  });

  return json as unknown as IListResponse;
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

    return transformListWithProducts(list);
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

    return transformListWithProducts(list);
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

    return transformListWithProducts(list);
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

    return transformListWithProducts(list);
  }

  static async reorderProducts(
    listId: string,
    userId: string,
    productIds: string[]
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);

    await ProductDAL.reorderProducts(listId, productIds);

    return transformListWithProducts(list);
  }
}
