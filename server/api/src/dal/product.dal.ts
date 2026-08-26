import mongoose from 'mongoose';
import { Product, MAX_EDIT_HISTORY, type IProductDoc, type IProductEditEntry } from '../models';
import { createBaseDal } from './base.dal';

export interface CreateProductInput {
  listId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  addedBy: string;
  position?: number;
  note?: string;
  clientId?: string;
}

export const ProductDAL = {
  ...createBaseDal<IProductDoc>(Product),

  async findByListId(listId: string) {
    return Product
      .find({ listId })
      .populate('addedBy', 'name')
      .populate('updatedBy', 'name')
      .populate('purchasedBy', 'name')
      .populate('editHistory.editedBy', 'name')
      .sort({ position: 1, createdAt: 1 })
      .lean();
  },

  // לצורך idempotency בהוספת מוצר (ראה product.service.ts:addProduct) -
  // מוצא מוצר שכבר נוצר עבור אותו clientId (temp id מהלקוח) ברשימה הזו.
  async findByClientId(listId: string, clientId: string): Promise<IProductDoc | null> {
    return Product.findOne({ listId, clientId }).populate('addedBy', 'name');
  },

  async findByListIds(listIds: string[]) {
    const objectIds = listIds.map(id => new mongoose.Types.ObjectId(id));
    const products = await Product
      .find({ listId: { $in: objectIds } })
      .populate('addedBy', 'name')
      .populate('updatedBy', 'name')
      .populate('purchasedBy', 'name')
      .populate('editHistory.editedBy', 'name')
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
  },

  async createProduct(data: CreateProductInput): Promise<IProductDoc> {
    // מיקום אוטומטי: Date.now() במקום countDocuments. countDocuments יכול
    // להחזיר את אותו מספר לשתי בקשות מקבילות (שני חברי קבוצה מוסיפים
    // מוצר באותו רגע) ולגרום להתנגשות positions. timestamp תמיד גדול
    // מה-positions הקטנים והרציפים שנוצרים ע"י reorderProducts, כך שמוצר
    // חדש תמיד מתווסף לסוף הרשימה, וההסתברות להתנגשות בין שתי הוספות
    // מקבילות מוגבלת לאותה מילישנייה בדיוק (במקום כל חלון race של round-trip
    // ל-DB) - ובכל מקרה עדיין קיים tie-break לפי createdAt במיון.
    const position = data.position ?? Date.now();

    const product = await Product.create({
      ...data,
      listId: new mongoose.Types.ObjectId(data.listId),
      addedBy: new mongoose.Types.ObjectId(data.addedBy),
      position,
    });

    return product.populate('addedBy', 'name');
  },

  async updateProduct(productId: string, updates: Partial<IProductDoc>): Promise<IProductDoc | null> {
    return Product
      .findByIdAndUpdate(productId, updates, { new: true })
      .populate('addedBy', 'name')
      .populate('updatedBy', 'name')
      .populate('purchasedBy', 'name');
  },

  // עדכון עם התאמת listId בפילטר - חוסך round-trip נפרד של findById
  // לאימות שהמוצר שייך לרשימה (ראה product.service.ts:updateProduct).
  async updateProductInList(productId: string, listId: string, updates: Partial<IProductDoc>): Promise<IProductDoc | null> {
    return Product
      .findOneAndUpdate({ _id: productId, listId }, updates, { new: true })
      .populate('addedBy', 'name')
      .populate('updatedBy', 'name')
      .populate('purchasedBy', 'name');
  },

  // כמו updateProductInList, אבל גם דוחף רשומת עריכה ל-editHistory (עם
  // $slice שמגביל ל-MAX_EDIT_HISTORY האחרונות) - שימוש יחיד: עריכת תוכן
  // (לא סימון קנייה) שבאמת שינתה שדה, ראה product.service.ts:updateProduct.
  async updateProductInListWithHistory(
    productId: string, listId: string, updates: Partial<IProductDoc>, historyEntry: IProductEditEntry
  ): Promise<IProductDoc | null> {
    return Product
      .findOneAndUpdate(
        { _id: productId, listId },
        {
          $set: updates,
          $push: { editHistory: { $each: [historyEntry], $slice: -MAX_EDIT_HISTORY } },
        },
        { new: true }
      )
      .populate('addedBy', 'name')
      .populate('updatedBy', 'name')
      .populate('purchasedBy', 'name')
      .populate('editHistory.editedBy', 'name');
  },

  async deleteProduct(productId: string): Promise<IProductDoc | null> {
    return Product.findByIdAndDelete(productId);
  },

  // מחיקה עם התאמת listId בפילטר - חוסך round-trip נפרד של findById
  // לאימות שהמוצר שייך לרשימה (ראה product.service.ts:deleteProduct).
  async deleteProductInList(productId: string, listId: string): Promise<IProductDoc | null> {
    return Product.findOneAndDelete({ _id: productId, listId });
  },

  async deleteByListId(listId: string): Promise<number> {
    const result = await Product.deleteMany({ listId });
    return result.deletedCount;
  },

  // מחיקת מוצרים של מספר רשימות (עם תמיכה בטרנזקציה)
  async deleteByListIds(listIds: string[], session?: mongoose.ClientSession): Promise<number> {
    if (listIds.length === 0) return 0;
    const objectIds = listIds.map(id => new mongoose.Types.ObjectId(id));
    const result = await Product.deleteMany(
      { listId: { $in: objectIds } },
      session ? { session } : undefined,
    );
    return result.deletedCount;
  },

  async reorderProducts(listId: string, productIds: string[]): Promise<void> {
    const bulkOps = productIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), listId: new mongoose.Types.ObjectId(listId) },
        update: { $set: { position: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await Product.bulkWrite(bulkOps);
    }
  },

  async clearPurchased(listId: string): Promise<number> {
    const result = await Product.deleteMany({ listId, isPurchased: true });
    return result.deletedCount;
  },

  async clearPending(listId: string): Promise<number> {
    const result = await Product.deleteMany({ listId, isPurchased: false });
    return result.deletedCount;
  },

  async clearAll(listId: string): Promise<number> {
    const result = await Product.deleteMany({ listId });
    return result.deletedCount;
  },

  // איפוס כל המוצרים ל"לא נקנה"
  async resetAll(listId: string): Promise<number> {
    const result = await Product.updateMany(
      { listId, isPurchased: true },
      { $set: { isPurchased: false } }
    );
    return result.modifiedCount;
  },

  async countByListId(listId: string): Promise<number> {
    return Product.countDocuments({ listId });
  },

  // ספירת מוצרים לפי רשימות (למנהל)
  async countGroupedByListIds(listIds: mongoose.Types.ObjectId[]): Promise<Map<string, { total: number; purchased: number }>> {
    if (listIds.length === 0) return new Map();
    const results = await Product.aggregate([
      { $match: { listId: { $in: listIds } } },
      { $group: { _id: '$listId', total: { $sum: 1 }, purchased: { $sum: { $cond: ['$isPurchased', 1, 0] } } } },
    ]);
    return new Map(results.map((r: { _id: mongoose.Types.ObjectId; total: number; purchased: number }) => [r._id.toString(), { total: r.total, purchased: r.purchased }]));
  },
};
