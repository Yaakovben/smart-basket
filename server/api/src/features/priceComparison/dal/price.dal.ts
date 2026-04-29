import { Price, type IPriceDoc, type ChainId } from '../models/Price.model';
import { BaseDAL } from '../../../dal/base.dal';

export interface UpsertPriceInput {
  barcode: string;
  itemName: string;
  itemNameNormalized: string;
  chainId: ChainId;
  chainName: string;
  storeId?: string;
  price: number;
  unitOfMeasure?: string;
  manufacturerName?: string;
  quantity?: number;
  // שדות עשירים מהפורטל
  manufactureCountry?: string;
  manufacturerItemDescription?: string;
  qtyInPackage?: number;
  isWeighted?: boolean;
  unitQty?: string;
  itemPriceUpdateDate?: Date;
  // דגלי סטטוס/מטא נוספים
  itemType?: number;
  itemId?: string;
  allowDiscount?: boolean;
  blockedItem?: boolean;
  itemStatus?: string;
  bikoretNo?: string;
  unitOfMeasurePrice?: number;
  // אגרגציה פר-סניף - מחושב על ידי ה-service לפני ה-upsert
  storesWithPrice?: number;
  priceMin?: number;
  priceMax?: number;
  cheapestStoreId?: string;
}

class PriceDALClass extends BaseDAL<IPriceDoc> {
  constructor() {
    super(Price);
  }

  // Upsert ברקוד+רשת: מעדכן את המחיר אם כבר קיים, יוצר אם לא
  async upsertByBarcodeAndChain(input: UpsertPriceInput) {
    return this.model.findOneAndUpdate(
      { barcode: input.barcode, chainId: input.chainId },
      { $set: input },
      { upsert: true, new: true }
    );
  }

  // Bulk upsert — יעיל לעדכון המוני של עשרות אלפי מוצרים
  async bulkUpsert(items: UpsertPriceInput[]) {
    if (items.length === 0) return 0;
    const ops = items.map(item => ({
      updateOne: {
        filter: { barcode: item.barcode, chainId: item.chainId },
        update: { $set: item },
        upsert: true,
      },
    }));
    const res = await this.model.bulkWrite(ops, { ordered: false });
    return (res.upsertedCount || 0) + (res.modifiedCount || 0);
  }

  // חיפוש לפי ברקוד: מחזיר מחירים מכל הרשתות
  async findByBarcode(barcode: string) {
    return this.model.find({ barcode }).lean();
  }

  // חיפוש לפי ברקודים: טעינה בלק של מחירים
  async findByBarcodes(barcodes: string[]) {
    if (barcodes.length === 0) return [];
    return this.model.find({ barcode: { $in: barcodes } }).lean();
  }

  // חיפוש fuzzy לפי שם מנורמל — כשאין ברקוד
  async findByNormalizedName(normalized: string, chainId?: ChainId, limit = 5) {
    const filter: Record<string, unknown> = {
      itemNameNormalized: { $regex: normalized, $options: 'i' },
    };
    if (chainId) filter.chainId = chainId;
    return this.model.find(filter).limit(limit).lean();
  }

  // חיפוש fuzzy אחד המאחד מספר טוקנים דרך $or — חוסך round-trips לעומת N שאילתות מקבילות.
  // chainId אופציונלי: אם מועבר — מסנן לרשת ספציפית; אם undefined — חוצה את כל הרשתות.
  async findByAnyToken(tokens: string[], chainId?: ChainId, limit = 60) {
    if (tokens.length === 0) return [];
    // מילוט תווים מיוחדים של regex
    const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const or = tokens.map(t => ({ itemNameNormalized: { $regex: escape(t), $options: 'i' } }));
    const filter: Record<string, unknown> = { $or: or };
    if (chainId) filter.chainId = chainId;
    return this.model.find(filter).limit(limit).lean();
  }

  async countByChain(chainId: ChainId) {
    return this.model.countDocuments({ chainId });
  }

  // סטטיסטיקה: רשימת רשתות פעילות (עם מוצרים במאגר) ומספר המוצרים בכל אחת
  async getActiveChainsWithCounts(): Promise<Array<{ chainId: ChainId; chainName: string; count: number }>> {
    const result = await this.model.aggregate([
      { $group: { _id: { chainId: '$chainId', chainName: '$chainName' }, count: { $sum: 1 } } },
      { $project: { _id: 0, chainId: '$_id.chainId', chainName: '$_id.chainName', count: 1 } },
      { $sort: { count: -1 } },
    ]);
    return result as Array<{ chainId: ChainId; chainName: string; count: number }>;
  }
}

export const PriceDAL = new PriceDALClass();
