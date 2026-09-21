import { BranchPrice, type IBranchPriceDoc } from '../models/BranchPrice.model';
import { createBaseDal } from '../../../dal/base.dal';
import type { ChainId } from '../models/Price.model';

export interface UpsertBranchPriceInput {
  chainId: ChainId;
  storeId: string;
  barcode: string;
  price: number;
}

export const BranchPriceDAL = {
  ...createBaseDal<IBranchPriceDoc>(BranchPrice),

  // Bulk upsert — מחיר בפועל של מוצר בסניף ספציפי
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

  // מחיר בפועל של ברקוד בסניף ספציפי - משמש להצגת "המחיר בסניף הקרוב אליי"
  // במקום המחיר הזול ביותר שנמצא אי-שם ברשת (Price.model).
  async findByBarcodesAndStore(barcodes: string[], chainId: ChainId, storeId: string) {
    if (barcodes.length === 0) return [];
    return BranchPrice.find({ barcode: { $in: barcodes }, chainId, storeId }).lean();
  },

  // מחירים של כמה ברקודים בסניף אחד, במפה barcode -> price. שאילתה אחת לכל סניף
  // במקום שאילתה לכל מוצר.
  async priceMapForStore(barcodes: string[], chainId: ChainId, storeId: string): Promise<Map<string, number>> {
    const rows = await this.findByBarcodesAndStore(barcodes, chainId, storeId);
    return new Map(rows.map(r => [r.barcode, r.price]));
  },

  // הסניפים המתומחרים כרגע, בלי מטמון - לבחירת סניפים בסנכרון
  async distinctStoreIds(chainId: ChainId): Promise<string[]> {
    return await BranchPrice.distinct('storeId', { chainId }) as string[];
  },

  // מוחק מחירים של סניפים שלא נבחרו (ראו storeSelection.ts). מחזיר כמה נמחקו.
  // מנקה גם את מטמון הסניפים המתומחרים כדי שלא יצביע על סניפים שנמחקו.
  async pruneChain(chainId: ChainId, keepStoreIds: string[]): Promise<number> {
    const res = await BranchPrice.deleteMany({ chainId, storeId: { $nin: keepStoreIds } });
    storeIdsCache.delete(chainId);
    return res.deletedCount ?? 0;
  },

  // הסניפים שיש להם נתוני מחיר בפועל, לפי רשת. בוחרים רק מביניהם "סניף קרוב",
  // אחרת המשתמש מקבל סניף קרוב שאין לו אף מחיר ונופלים למחיר הזול ברשת.
  // הנתון משתנה רק בסנכרון, לכן מטמון של שעה.
  async storeIdsWithPrices(chainId: ChainId): Promise<Set<string>> {
    const cached = storeIdsCache.get(chainId);
    if (cached && cached.expiresAt > Date.now()) return cached.ids;
    const ids = await BranchPrice.distinct('storeId', { chainId }) as string[];
    const set = new Set(ids);
    storeIdsCache.set(chainId, { ids: set, expiresAt: Date.now() + STORE_IDS_CACHE_TTL_MS });
    return set;
  },
};

const STORE_IDS_CACHE_TTL_MS = 60 * 60_000;
const storeIdsCache = new Map<string, { ids: Set<string>; expiresAt: number }>();
