import { PushSubscription, type IPushSubscription } from '../models';
import { BaseDAL } from './base.dal';
import type { ClientSession } from 'mongoose';

class PushSubscriptionDALClass extends BaseDAL<IPushSubscription> {
  constructor() {
    super(PushSubscription);
  }

  async findByUserId(userId: string): Promise<IPushSubscription[]> {
    return this.model.find({ userId });
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.model.deleteOne({ endpoint });
  }

  async deleteByUserAndEndpoint(userId: string, endpoint: string): Promise<void> {
    await this.model.deleteOne({ userId, endpoint });
  }

  async deleteByUserId(userId: string, session?: ClientSession): Promise<number> {
    const result = await this.model.deleteMany({ userId }, session ? { session } : {});
    return result.deletedCount;
  }

  async countByUserId(userId: string): Promise<number> {
    return this.model.countDocuments({ userId });
  }
}

export const PushSubscriptionDAL = new PushSubscriptionDALClass();
