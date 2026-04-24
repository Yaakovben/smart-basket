import { Branch, type IBranchDoc } from '../models/Branch.model';
import type { ChainId } from '../models/Price.model';
import { BaseDAL } from '../../../dal/base.dal';

export interface UpsertBranchInput {
  chainId: ChainId;
  chainName: string;
  storeId: string;
  storeName: string;
  address?: string;
  city?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  coordSource: 'portal' | 'geocoded' | 'unknown';
}

class BranchDALClass extends BaseDAL<IBranchDoc> {
  constructor() {
    super(Branch);
  }

  async bulkUpsert(items: UpsertBranchInput[]) {
    if (items.length === 0) return 0;
    const now = new Date();
    const ops = items.map(item => ({
      updateOne: {
        filter: { chainId: item.chainId, storeId: item.storeId },
        update: { $set: { ...item, lastSyncedAt: now } },
        upsert: true,
      },
    }));
    const res = await this.model.bulkWrite(ops, { ordered: false });
    return (res.upsertedCount || 0) + (res.modifiedCount || 0);
  }

  // כל הסניפים של רשת - לחישוב נציג קרוב ל-user
  async findByChain(chainId: ChainId) {
    return this.model.find({ chainId }).lean();
  }

  // כל הסניפים - לחישוב כל הרשתות בבת אחת (cached ב-service)
  async findAll() {
    return this.model.find({}).lean();
  }

  // סניפים שחסר להם lat/lng - לרוץ geocoding עליהם
  async findMissingCoords(limit = 50) {
    return this.model
      .find({ $or: [{ lat: { $exists: false } }, { lat: null }] })
      .limit(limit)
      .lean();
  }

  async updateCoords(id: string, lat: number, lng: number, source: 'portal' | 'geocoded') {
    return this.model.updateOne({ _id: id }, { $set: { lat, lng, coordSource: source } });
  }

  // ספירת סניפים לפי רשת - למסך אדמין
  async countsByChain(): Promise<Array<{ chainId: ChainId; count: number; withCoords: number }>> {
    const res = await this.model.aggregate<{ _id: ChainId; count: number; withCoords: number }>([
      {
        $group: {
          _id: '$chainId',
          count: { $sum: 1 },
          withCoords: {
            $sum: { $cond: [{ $and: [{ $ne: ['$lat', null] }, { $ne: ['$lat', undefined] }] }, 1, 0] },
          },
        },
      },
    ]);
    return res.map(r => ({ chainId: r._id, count: r.count, withCoords: r.withCoords }));
  }
}

export const BranchDAL = new BranchDALClass();
