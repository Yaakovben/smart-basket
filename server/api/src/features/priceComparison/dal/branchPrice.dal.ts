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

  // מנקה את כיסוי המחירים של הרשת: רשת בלי מזהי סניף או שחרגה מהתקציב נשארת ברמת
  // רשת. לא מוחק את המסמך, כי הוא מחזיק גם את כיסוי המבצעים.
  async clearCoverage(chainId: ChainId): Promise<void> {
    await ChainPriceCoverage.updateOne({ chainId }, { $set: { storeIds: [] } });
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

  // מסמן ריצת מבצעים כנוכחית: סדר הסניפים (של מפות הביטים) ומזהה הריצה בכתיבה אחת
  async recordPromoCoverage(chainId: ChainId, storeIds: string[], runId: string, syncedAt: Date): Promise<void> {
    await ChainPriceCoverage.updateOne(
      { chainId },
      { $set: { promoStoreIds: storeIds, promoSyncRunId: runId, promoSyncedAt: syncedAt } },
      { upsert: true },
    );
    promoCoverageCache.delete(chainId);
  },

  // ריצת המבצעים הנוכחית של הרשת וסדר הסניפים שלה. מטמון קצר: מתחלף רק בסנכרון,
  // אבל שרת אחר (או סקריפט) יכול לסנכרן, ומפות ביטים בסדר לא נכון מטעות.
  async promoCoverage(chainId: ChainId): Promise<{ storeIds: string[]; runId?: string }> {
    const cached = promoCoverageCache.get(chainId);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const doc = await ChainPriceCoverage.findOne({ chainId }, { promoStoreIds: 1, promoSyncRunId: 1 }).lean();
    const value = { storeIds: doc?.promoStoreIds ?? [], runId: doc?.promoSyncRunId };
    promoCoverageCache.set(chainId, { value, expiresAt: Date.now() + PROMO_COVERAGE_CACHE_TTL_MS });
    return value;
  },
};

const STORE_IDS_CACHE_TTL_MS = 60 * 60_000;
const PROMO_COVERAGE_CACHE_TTL_MS = 5 * 60_000;
const storeIdsCache = new Map<string, { ids: Set<string>; expiresAt: number }>();
const promoCoverageCache = new Map<string, { value: { storeIds: string[]; runId?: string }; expiresAt: number }>();
