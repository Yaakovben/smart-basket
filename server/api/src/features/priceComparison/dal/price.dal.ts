import { Price, type IPriceDoc, type ChainId } from '../models/Price.model';
import { createBaseDal } from '../../../dal/base.dal';

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

export const PriceDAL = {
  ...createBaseDal<IPriceDoc>(Price),

  // Upsert ברקוד+רשת: מעדכן את המחיר אם כבר קיים, יוצר אם לא
  async upsertByBarcodeAndChain(input: UpsertPriceInput) {
    return Price.findOneAndUpdate(
      { barcode: input.barcode, chainId: input.chainId },
      { $set: input },
      { upsert: true, new: true }
    );
  },

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
    const res = await Price.bulkWrite(ops, { ordered: false });
    return (res.upsertedCount || 0) + (res.modifiedCount || 0);
  },

  // חיפוש לפי ברקוד: מחזיר מחירים מכל הרשתות
  async findByBarcode(barcode: string) {
    return Price.find({ barcode }).lean();
  },

  // חיפוש לפי ברקודים: טעינה בלק של מחירים
  async findByBarcodes(barcodes: string[]) {
    if (barcodes.length === 0) return [];
    return Price.find({ barcode: { $in: barcodes } }).lean();
  },

  // חיפוש fuzzy לפי שם מנורמל — כשאין ברקוד
  async findByNormalizedName(normalized: string, chainId?: ChainId, limit = 5) {
    const filter: Record<string, unknown> = {
      itemNameNormalized: { $regex: normalized, $options: 'i' },
    };
    if (chainId) filter.chainId = chainId;
    return Price.find(filter).limit(limit).lean();
  },

  // חיפוש fuzzy מועמדים - היה $or של $regex לא-מעוגן (case-insensitive),
  // שלא יכול להשתמש באף אינדקס ומריץ full collection scan על כל הקולקציה
  // (מאות אלפי מסמכים) בכל קריאה - הצוואר-בקבוק העיקרי בהתאמת מחירים.
  // הוחלף ל-$text, שמשתמש באינדקס ה-text הקיים (itemNameNormalized: 'text',
  // Price.model.ts) שהיה מוגדר אבל בפועל לא בשימוש. $text מפרק למילים שלמות
  // (בלי substring באמצע מילה) - matchNormalizedName כבר עושה בכל מקרה
  // התאמה מדויקת/שורש (stemHebrew) ברמת מילה שלמה על תוצאות המועמדים, כך
  // שזה כמעט תמיד מספיק; המקרה הנדיר שנפגע הוא מילה מחוברת (למשל substring
  // באמצע מילה בודדת בלי רווח) שלא הייתה תלויה ב-stemming ממילא.
  // chainId אופציונלי: אם מועבר — מסנן לרשת ספציפית; אם undefined — חוצה את כל הרשתות.
  async findByAnyToken(tokens: string[], chainId?: ChainId, limit = 60) {
    if (tokens.length === 0) return [];
    const filter: Record<string, unknown> = { $text: { $search: tokens.join(' ') } };
    if (chainId) filter.chainId = chainId;
    return Price.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();
  },

  async countByChain(chainId: ChainId) {
    return Price.countDocuments({ chainId });
  },

  // סטטיסטיקה: רשימת רשתות פעילות (עם מוצרים במאגר) ומספר המוצרים בכל אחת.
  // קרוא מ-4 מקומות שונים (chainComparison, priceComparison.service,
  // spending.service, status.controller) - בלי cache זה היה $group מלא על
  // כל collection ה-prices (מאות אלפי מסמכים) בכל בקשה. הנתון משתנה רק
  // פעמיים ביום (סנכרון) אז TTL של שעה מספיק בלי צורך ב-invalidation מפורש.
  async getActiveChainsWithCounts(): Promise<Array<{ chainId: ChainId; chainName: string; count: number }>> {
    const cached = activeChainsCache;
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const result = await Price.aggregate([
      { $group: { _id: { chainId: '$chainId', chainName: '$chainName' }, count: { $sum: 1 } } },
      { $project: { _id: 0, chainId: '$_id.chainId', chainName: '$_id.chainName', count: 1 } },
      { $sort: { count: -1 } },
    ]) as Array<{ chainId: ChainId; chainName: string; count: number }>;

    activeChainsCache = { data: result, expiresAt: Date.now() + ACTIVE_CHAINS_CACHE_TTL_MS };
    return result;
  },
};

const ACTIVE_CHAINS_CACHE_TTL_MS = 60 * 60_000;
let activeChainsCache: { data: Array<{ chainId: ChainId; chainName: string; count: number }>; expiresAt: number } | null = null;
