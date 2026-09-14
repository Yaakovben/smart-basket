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
};
