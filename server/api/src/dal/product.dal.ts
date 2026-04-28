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
  note?: string;
  barcode?: string;
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

    type LeanProduct = ReturnType<IProductDoc['toObject']>;
    const map = new Map<string, LeanProduct[]>();
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

  // מחיקת מוצרים של מספר רשימות (עם תמיכה בטרנזקציה)
  async deleteByListIds(listIds: string[], session?: mongoose.ClientSession): Promise<number> {
    if (listIds.length === 0) return 0;
    const objectIds = listIds.map(id => new mongoose.Types.ObjectId(id));
    const result = await this.model.deleteMany(
      { listId: { $in: objectIds } },
      session ? { session } : undefined,
    );
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

  async clearPending(listId: string): Promise<number> {
    const result = await this.model.deleteMany({ listId, isPurchased: false });
    return result.deletedCount;
  }

  async clearAll(listId: string): Promise<number> {
    const result = await this.model.deleteMany({ listId });
    return result.deletedCount;
  }

  // איפוס כל המוצרים ל"לא נקנה"
  async resetAll(listId: string): Promise<number> {
    const result = await this.model.updateMany(
      { listId, isPurchased: true },
      { $set: { isPurchased: false } }
    );
    return result.modifiedCount;
  }

  async countByListId(listId: string): Promise<number> {
    return this.model.countDocuments({ listId });
  }

  // ספירת מוצרים לפי רשימות (למנהל)
  async countGroupedByListIds(listIds: mongoose.Types.ObjectId[]): Promise<Map<string, { total: number; purchased: number }>> {
    if (listIds.length === 0) return new Map();
    const results = await this.model.aggregate([
      { $match: { listId: { $in: listIds } } },
      { $group: { _id: '$listId', total: { $sum: 1 }, purchased: { $sum: { $cond: ['$isPurchased', 1, 0] } } } },
    ]);
    return new Map(results.map((r: { _id: mongoose.Types.ObjectId; total: number; purchased: number }) => [r._id.toString(), { total: r.total, purchased: r.purchased }]));
  }
}

export const ProductDAL = new ProductDALClass();
