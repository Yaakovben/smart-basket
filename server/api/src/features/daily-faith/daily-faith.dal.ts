import mongoose from 'mongoose';
import { createBaseDal } from '../../dal/base.dal';
import { DailyFaith, type IDailyFaith } from './daily-faith.model';

export const DailyFaithDAL = {
  ...createBaseDal<IDailyFaith>(DailyFaith),

  async findAllSorted(): Promise<IDailyFaith[]> {
    return DailyFaith.find({}).sort({ createdAt: -1 });
  },

  /**
   * מחזיר ציטוט אקראי אחד. אם מועברים מזהים להחרגה, מנסה קודם
   * ציטוט שלא ברשימה (כדי לא לחזור על מה שהמשתמש ראה השבוע).
   * אם כל הציטוטים מוחרגים - מחזיר אקראי מהכל כ-fallback.
   */
  async findRandom(excludeIds: string[] = []): Promise<IDailyFaith | null> {
    // המרת IDs לחוקיים ל-ObjectId; מתעלמים מ-IDs לא תקינים
    const excludeObjectIds = excludeIds
      .filter(id => mongoose.isValidObjectId(id))
      .map(id => new mongoose.Types.ObjectId(id));

    const tryExclude = excludeObjectIds.length > 0;

    if (tryExclude) {
      const filtered = await DailyFaith.aggregate([
        { $match: { _id: { $nin: excludeObjectIds } } },
        { $sample: { size: 1 } },
      ]);
      if (filtered[0]) return DailyFaith.findById(filtered[0]._id);
      // כל המשפטים במאגר נצפו — נופלים למשפט אקראי לחלוטין
    }

    const result = await DailyFaith.aggregate([{ $sample: { size: 1 } }]);
    if (!result[0]) return null;
    return DailyFaith.findById(result[0]._id);
  },
};
