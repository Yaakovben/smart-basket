import { ChainPriceCoverage } from '../models/ChainPriceCoverage.model';
import type { ChainId } from '../models/Price.model';

// כיסוי מחירי סניף: אילו סניפים של רשת הופיעו בפיד המחירים האחרון. את חריגות
// המחיר עצמן שומרים בתוך מסמכי Price (storePrices), ראו services/branchPricing.ts.
export const BranchPriceDAL = {
  // שומר אילו סניפים הופיעו בפיד האחרון של הרשת (מזהים מנורמלים)
  async recordCoverage(chainId: ChainId, storeIds: string[], syncedAt: Date): Promise<void> {
    await ChainPriceCoverage.updateOne({ chainId }, { $set: { storeIds, syncedAt } }, { upsert: true });
    storeIdsCache.delete(chainId);
  },

  // מוחק את כיסוי הרשת: רשת בלי מזהי סניף או שחרגה מהתקציב נשארת ברמת רשת
  async clearCoverage(chainId: ChainId): Promise<void> {
    await ChainPriceCoverage.deleteOne({ chainId });
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
