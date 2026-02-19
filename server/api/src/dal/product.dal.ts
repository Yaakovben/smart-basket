import mongoose from 'mongoose';
import { Product, type IProductDoc } from '../models';
import { BaseDAL } from './base.dal';

export interface CreateProductInput {
  listId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  addedBy: string;
  position?: number;
}

class ProductDALClass extends BaseDAL<IProductDoc> {
  constructor() {
    super(Product);
  }

  async findByListId(listId: string) {
    return this.model
      .find({ listId })
      .populate('addedBy', 'name')
      .sort({ position: 1, createdAt: 1 })
      .lean();
  }

  async findByListIds(listIds: string[]) {
    const objectIds = listIds.map(id => new mongoose.Types.ObjectId(id));
    const products = await this.model
      .find({ listId: { $in: objectIds } })
      .populate('addedBy', 'name')
      .sort({ position: 1, createdAt: 1 })
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any[]>();
    for (const id of listIds) {
      map.set(id, []);
    }
    for (const product of products) {
      const key = product.listId.toString();
      map.get(key)?.push(product);
    }
    return map;
  }

  async createProduct(data: CreateProductInput): Promise<IProductDoc> {
    // מיקום לפי countDocuments - חלון race קטן מקובל, ממוין גם לפי createdAt
    const position = data.position ?? await this.model.countDocuments({ listId: data.listId });

    const product = await this.model.create({
      ...data,
      listId: new mongoose.Types.ObjectId(data.listId),
      addedBy: new mongoose.Types.ObjectId(data.addedBy),
      position,
    });

    return product.populate('addedBy', 'name');
  }

  async updateProduct(productId: string, updates: Partial<IProductDoc>): Promise<IProductDoc | null> {
    return this.model
      .findByIdAndUpdate(productId, updates, { new: true })
      .populate('addedBy', 'name');
  }

  async deleteProduct(productId: string): Promise<IProductDoc | null> {
    return this.model.findByIdAndDelete(productId);
  }

  async deleteByListId(listId: string): Promise<number> {
    const result = await this.model.deleteMany({ listId });
    return result.deletedCount;
  }

  async reorderProducts(listId: string, productIds: string[]): Promise<void> {
    const bulkOps = productIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), listId: new mongoose.Types.ObjectId(listId) },
        update: { $set: { position: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await this.model.bulkWrite(bulkOps);
    }
  }

  async clearPurchased(listId: string): Promise<number> {
    const result = await this.model.deleteMany({ listId, isPurchased: true });
    return result.deletedCount;
  }

  async countByListId(listId: string): Promise<number> {
    return this.model.countDocuments({ listId });
  }
}

export const ProductDAL = new ProductDALClass();
