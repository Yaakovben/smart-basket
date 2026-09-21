import { BranchPrice, type IBranchPriceDoc } from '../models/BranchPrice.model';
import { ChainPriceCoverage } from '../models/ChainPriceCoverage.model';
import { createBaseDal } from '../../../dal/base.dal';
import type { ChainId } from '../models/Price.model';

export interface UpsertBranchPriceInput {
  chainId: ChainId;
  // מזהה סניף מנורמל (normStoreId) - כך גם הסניף מקובץ הסניפים וגם מהפיד מתאימים
  storeId: string;
  barcode: string;
  price: number;
  syncedAt?: Date;
}

export const BranchPriceDAL = {
  ...createBaseDal<IBranchPriceDoc>(BranchPrice),

  // Bulk upsert — חריגות המחיר של סניף (ראו services/branchPricing.ts)
  async bulkUpsert(items: UpsertBranchPriceInput[]) {
    if (items.length === 0) return 0;
    const ops = items.map(item => ({
      updateOne: {
        filter: { chainId: item.chainId, storeId: item.storeId, barcode: item.barcode },
        update: { $set: item },
        upsert: true,
      },
    }));
    const res = await BranchPrice.bulkWrite(ops, { ordered: false });
    return (res.upsertedCount || 0) + (res.modifiedCount || 0);
  },

  // מחיר שמור של ברקוד בסניף ספציפי (חריגה או מוצר בכיסוי נמוך). storeId מנורמל.
  // אין שורה = ייתכן שהמחיר הנפוץ - ראו resolveBranchPrice.
  async findByBarcodesAndStore(barcodes: string[], chainId: ChainId, storeId: string) {
    if (barcodes.length === 0) return [];
    return BranchPrice.find({ barcode: { $in: barcodes }, chainId, storeId }).lean();
  },

  // מוחק שורות של סנכרונים קודמים של הרשת. חובה אחרי כל סנכרון מוצלח: חריגה
  // שנעלמה (הסניף חזר למחיר הנפוץ) אחרת הייתה נשארת ומציגה מחיר ישן.
  async pruneStale(chainId: ChainId, syncStart: Date): Promise<number> {
    const res = await BranchPrice.deleteMany({
      chainId,
      $or: [{ syncedAt: { $lt: syncStart } }, { syncedAt: { $exists: false } }],
    });
    return res.deletedCount ?? 0;
  },

  // מוחק את כל נתוני הסניף של הרשת (שורות וכיסוי). לרשת שחרגה מתקציב השורות:
  // שורות ישנות בלי כיסוי היו ממשיכות להציג מחירים מפורשים שכבר לא עדכניים.
  async clearChain(chainId: ChainId): Promise<number> {
    const res = await BranchPrice.deleteMany({ chainId });
    await ChainPriceCoverage.deleteOne({ chainId });
    storeIdsCache.delete(chainId);
    return res.deletedCount ?? 0;
  },

  // שומר אילו סניפים הופיעו בפיד האחרון של הרשת (מזהים מנורמלים)
  async recordCoverage(chainId: ChainId, storeIds: string[], syncedAt: Date): Promise<void> {
    await ChainPriceCoverage.updateOne({ chainId }, { $set: { storeIds, syncedAt } }, { upsert: true });
    storeIdsCache.delete(chainId);
  },

  // הסניפים שסונכרנו (הופיעו בפיד המחירים האחרון). רק עליהם אפשר להסיק מחיר.
  // הנתון משתנה רק בסנכרון, לכן מטמון של שעה.
  async storeIdsWithPrices(chainId: ChainId): Promise<Set<string>> {
    const cached = storeIdsCache.get(chainId);
    if (cached && cached.expiresAt > Date.now()) return cached.ids;
    const doc = await ChainPriceCoverage.findOne({ chainId }, { storeIds: 1 }).lean();
    const set = new Set(doc?.storeIds ?? []);
    storeIdsCache.set(chainId, { ids: set, expiresAt: Date.now() + STORE_IDS_CACHE_TTL_MS });
    return set;
  },
};

const STORE_IDS_CACHE_TTL_MS = 60 * 60_000;
const storeIdsCache = new Map<string, { ids: Set<string>; expiresAt: number }>();
