import { PriceMatchOverride, type IPriceMatchOverrideDoc } from '../models/PriceMatchOverride.model';
import { createBaseDal } from '../../../dal/base.dal';

// תקרה לתיקונים למשתמש - מונעת ניפוח האוסף ואת עלות טעינתם בכל השוואה.
export const MAX_OVERRIDES_PER_USER = 300;

export const PriceMatchOverrideDAL = {
  ...createBaseDal<IPriceMatchOverrideDoc>(PriceMatchOverride),

  async listByUser(userId: string) {
    return PriceMatchOverride.find({ userId }).lean();
  },

  async countByUser(userId: string) {
    return PriceMatchOverride.countDocuments({ userId });
  },

  // יוצר או מעדכן את התיקון של המשתמש לשם מוצר נתון
  async upsert(userId: string, key: string, productName: string, choice: { barcode?: string; excluded: boolean }) {
    return PriceMatchOverride.findOneAndUpdate(
      { userId, key },
      choice.excluded
        ? { $set: { productName, excluded: true }, $unset: { barcode: 1 } }
        : { $set: { productName, excluded: false, barcode: choice.barcode } },
      { upsert: true, new: true }
    );
  },

  async remove(userId: string, key: string) {
    const res = await PriceMatchOverride.deleteOne({ userId, key });
    return res.deletedCount > 0;
  },
};
