import { BaseDAL } from '../../dal/base.dal';
import { DailyFaith, type IDailyFaith } from './daily-faith.model';

class DailyFaithDALClass extends BaseDAL<IDailyFaith> {
  constructor() {
    super(DailyFaith);
  }

  async findAllSorted(): Promise<IDailyFaith[]> {
    return this.model.find({}).sort({ createdAt: -1 });
  }

  async findRandom(): Promise<IDailyFaith | null> {
    const result = await this.model.aggregate([{ $sample: { size: 1 } }]);
    if (!result[0]) return null;
    return this.model.findById(result[0]._id);
  }
}

export const DailyFaithDAL = new DailyFaithDALClass();
