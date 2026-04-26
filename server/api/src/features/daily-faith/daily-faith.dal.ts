import mongoose from 'mongoose';
import { BaseDAL } from '../../dal/base.dal';
import { DailyFaith, type IDailyFaith } from './daily-faith.model';

class DailyFaithDALClass extends BaseDAL<IDailyFaith> {
  constructor() {
    super(DailyFaith);
  }

  async findAllSorted(): Promise<IDailyFaith[]> {
    return this.model.find({}).sort({ createdAt: -1 });
  }

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
      const filtered = await this.model.aggregate([
        { $match: { _id: { $nin: excludeObjectIds } } },
        { $sample: { size: 1 } },
      ]);
      if (filtered[0]) return this.model.findById(filtered[0]._id);
      // כל המשפטים במאגר נצפו — נופלים למשפט אקראי לחלוטין
    }

    const result = await this.model.aggregate([{ $sample: { size: 1 } }]);
    if (!result[0]) return null;
    return this.model.findById(result[0]._id);
  }
}

export const DailyFaithDAL = new DailyFaithDALClass();
