import { Promotion, type IPromotionDoc } from '../models/Promotion.model';
import { BranchPriceDAL } from './branchPrice.dal';
import type { ChainId } from '../models/Price.model';
import type { AggregatedPromotion } from '../services/promoAggregation';

const BATCH_SIZE = 200;

export const PromotionDAL = {
  // כמה מבצעים שמורים היום לרשת בריצה הנוכחית (לבדיקת ירידה חדה לפני החלפה)
  async countCurrent(chainId: ChainId): Promise<number> {
    const { runId } = await BranchPriceDAL.promoCoverage(chainId);
    return runId ? Promotion.countDocuments({ chainId, syncRunId: runId }) : 0;
  },

  /**
   * כותב את מבצעי הריצה החדשה, מסמן אותה כנוכחית ורק אז מוחק ריצות קודמות.
   * עד הסימון, הקוראים רואים את הריצה הקודמת במלואה (עם סדר הסניפים שלה), כך
   * שכשל באמצע הכתיבה לא משאיר נתונים חלקיים או מפות ביטים בסדר הלא נכון.
   */
  async replaceChainPromotions(
    chainId: ChainId,
    promotions: AggregatedPromotion[],
    storeIds: string[],
    runId: string,
    source: string,
    fetchedAt: Date,
  ): Promise<{ inserted: number; deleted: number }> {
    let inserted = 0;
    for (let i = 0; i < promotions.length; i += BATCH_SIZE) {
      const batch = promotions.slice(i, i + BATCH_SIZE).map(p => ({
        chainId,
        promotionId: p.promotionId,
        variantKey: p.variantKey,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        clubOnly: p.clubOnly,
        minPurchaseAmount: p.minPurchaseAmount,
        items: p.items,
        syncRunId: runId,
        source,
        fetchedAt,
      }));
      const res = await Promotion.insertMany(batch, { ordered: false, rawResult: true });
      inserted += res.insertedCount;
      // משחרר את ה-event loop לבקשות של משתמשים בין batches
      await new Promise<void>(r => setImmediate(r));
    }
    await BranchPriceDAL.recordPromoCoverage(chainId, storeIds, runId, fetchedAt);
    const del = await Promotion.deleteMany({ chainId, syncRunId: { $ne: runId } });
    return { inserted, deleted: del.deletedCount ?? 0 };
  },

  // מחיקת שאריות של ריצה שנכשלה באמצע הכתיבה (לפני שסומנה כנוכחית)
  async deleteRun(chainId: ChainId, runId: string): Promise<void> {
    await Promotion.deleteMany({ chainId, syncRunId: runId });
  },

  // מבצעים של הריצה הנוכחית בכל רשת, שמכילים אחד מהברקודים ושתקפים ברגע at
  async findActiveForBarcodes(barcodes: string[], at: Date, chainIds: ChainId[]): Promise<IPromotionDoc[]> {
    if (barcodes.length === 0 || chainIds.length === 0) return [];
    const runs = await Promise.all(chainIds.map(async chainId => ({ chainId, runId: (await BranchPriceDAL.promoCoverage(chainId)).runId })));
    const current = runs.filter((r): r is { chainId: ChainId; runId: string } => !!r.runId);
    if (current.length === 0) return [];
    return Promotion.find({
      'items.barcode': { $in: barcodes },
      $or: current.map(r => ({ chainId: r.chainId, syncRunId: r.runId })),
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: at } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: at } }] },
      ],
    }).lean<IPromotionDoc[]>();
  },
};
