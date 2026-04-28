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
    const ops = items.map(item => {
      // הפרדה: שדות "קשיחים" (תמיד נכתבים) ושדות אופציונליים שנכתבים רק אם קיים ערך.
      // המטרה: סנכרון מהפורטל לא ימחק כתובת שהגיעה מ-OSM, ולהיפך.
      const $set: Record<string, unknown> = {
        chainId: item.chainId,
        chainName: item.chainName,
        storeId: item.storeId,
        storeName: item.storeName,
        lastSyncedAt: now,
      };
      if (item.address) $set.address = item.address;
      if (item.city) $set.city = item.city;
      if (item.zipCode) $set.zipCode = item.zipCode;
      // קואורדינטות: רק אם 'portal' או יש ערכים. 'unknown' לא דורס מצב קודם טוב.
      if (item.lat !== undefined && item.lng !== undefined && item.coordSource !== 'unknown') {
        $set.lat = item.lat;
        $set.lng = item.lng;
        $set.coordSource = item.coordSource;
      }
      return {
        updateOne: {
          filter: { chainId: item.chainId, storeId: item.storeId },
          update: { $set, $setOnInsert: { coordSource: item.coordSource } },
          upsert: true,
        },
      };
    });
    const res = await this.model.bulkWrite(ops, { ordered: false });
    return (res.upsertedCount || 0) + (res.modifiedCount || 0);
  }

  // כל הסניפים של רשת - לחישוב נציג קרוב ל-user
  async findByChain(chainId: ChainId) {
    return this.model.find({ chainId }).sort({ city: 1, storeName: 1 }).lean();
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
