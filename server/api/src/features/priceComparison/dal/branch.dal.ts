import { Branch, type IBranchDoc } from '../models/Branch.model';
import type { ChainId } from '../models/Price.model';
import { createBaseDal } from '../../../dal/base.dal';

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
  subChainId?: string;
  subChainName?: string;
  storeType?: string;
  openingHours?: string;
}

export const BranchDAL = {
  ...createBaseDal<IBranchDoc>(Branch),

  async bulkUpsert(items: UpsertBranchInput[]) {
    if (items.length === 0) return 0;
    // שאיבת רשימת סניפים שמסומנים coordSource='manual' - לא נוגעים בהם בכלל.
    // ההגדרות הידניות הן הכי מדויקות ולא צריך לדרוס אותן בסנכרון אוטומטי.
    const keys = items.map(i => ({ chainId: i.chainId, storeId: i.storeId }));
    const manualBranches = await Branch.find(
      { $or: keys, coordSource: 'manual' },
      { chainId: 1, storeId: 1 }
    ).lean();
    const manualSet = new Set(manualBranches.map(b => `${b.chainId}::${b.storeId}`));
    if (manualSet.size > 0) {
      console.log(`[bulkUpsert] דילוג על ${manualSet.size} סניפים עם coordSource='manual'`);
    }
    const filtered = items.filter(i => !manualSet.has(`${i.chainId}::${i.storeId}`));
    if (filtered.length === 0) return 0;
    const now = new Date();
    const ops = filtered.map(item => {
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
      if (item.subChainId) $set.subChainId = item.subChainId;
      if (item.subChainName) $set.subChainName = item.subChainName;
      if (item.storeType) $set.storeType = item.storeType;
      if (item.openingHours) $set.openingHours = item.openingHours;
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
    const res = await Branch.bulkWrite(ops, { ordered: false });
    return (res.upsertedCount || 0) + (res.modifiedCount || 0);
  },

  // כל הסניפים של רשת - לחישוב נציג קרוב ל-user
  async findByChain(chainId: ChainId) {
    return Branch.find({ chainId }).sort({ city: 1, storeName: 1 }).lean();
  },

  // כל הסניפים - לחישוב כל הרשתות בבת אחת (cached ב-service)
  async findAll() {
    return Branch.find({}).lean();
  },

  // סניפים שחסר להם lat/lng - לרוץ geocoding עליהם
  async findMissingCoords(limit = 50) {
    return Branch
      .find({ $or: [{ lat: { $exists: false } }, { lat: null }] })
      .limit(limit)
      .lean();
  },

  async updateCoords(id: string, lat: number, lng: number, source: 'portal' | 'geocoded' | 'manual' | 'unknown') {
    return Branch.updateOne({ _id: id }, { $set: { lat, lng, coordSource: source } });
  },

  // ספירת סניפים לפי רשת - למסך אדמין
  async countsByChain(): Promise<Array<{ chainId: ChainId; count: number; withCoords: number }>> {
    const res = await Branch.aggregate<{ _id: ChainId; count: number; withCoords: number }>([
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
  },

  // ספירה גלובלית לפי coordSource - לצורך תצוגת אדמין מפורטת
  async countsBySource(): Promise<{ portal: number; geocoded: number; manual: number; unknown: number; noCoords: number; total: number }> {
    const res = await Branch.aggregate<{ _id: string; count: number; withCoords: number }>([
      {
        $group: {
          _id: '$coordSource',
          count: { $sum: 1 },
          withCoords: {
            $sum: { $cond: [{ $and: [{ $ne: ['$lat', null] }, { $ne: ['$lat', undefined] }] }, 1, 0] },
          },
        },
      },
    ]);
    const result = { portal: 0, geocoded: 0, manual: 0, unknown: 0, noCoords: 0, total: 0 };
    for (const r of res) {
      const key = r._id as 'portal' | 'geocoded' | 'manual' | 'unknown';
      if (key in result) result[key] = r.count;
      // סניפים ללא lat גם אם coordSource מוגדר (לדוגמה unknown) - מסומנים כ-noCoords
      if (r._id === 'unknown' || r._id === null) result.noCoords += (r.count - r.withCoords);
      result.total += r.count;
    }
    return result;
  },
};
