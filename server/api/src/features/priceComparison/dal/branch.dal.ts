import { Branch, type IBranchDoc } from '../models/Branch.model';
import type { ChainId } from '../models/Price.model';
import { createBaseDal } from '../../../dal/base.dal';
import { normStoreId } from '../services/storeId';

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

  async bulkUpsert(rawItems: UpsertBranchInput[]) {
    if (rawItems.length === 0) return 0;
    // מזהה סניף אחיד, בלי אפסים מובילים: אותו סניף הגיע פעם כ-"022" ופעם כ-"22",
    // ונשמר פעמיים (100 סניפים כפולים במעיין 2000, שפע וסופר ספיר)
    const items = rawItems.map(i => ({ ...i, storeId: normStoreId(i.storeId) }));
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

  // מאפס קואורדינטות שגיאוקודינג אוטומטי שם במקום שגוי (סותר את העיר בשם הסניף,
  // או נקודת ברירת המחדל של הגיאוקודר), כדי שהגיאוקודינג הלילי ינסה שוב עם
  // הוולידציה המלאה. לא נוגע במיקום מהפורטל או ידני. מחזיר כמה אופסו.
  async resetInvalidGeocodedCoords(isInvalid: (b: { lat: number; lng: number; storeName: string }) => boolean): Promise<number> {
    const geocoded = await Branch.find({ coordSource: 'geocoded', lat: { $type: 'number' } }, { lat: 1, lng: 1, storeName: 1 }).lean();
    const ids = geocoded.filter(b => typeof b.lat === 'number' && typeof b.lng === 'number' && isInvalid({ lat: b.lat, lng: b.lng, storeName: b.storeName })).map(b => b._id);
    if (ids.length === 0) return 0;
    const res = await Branch.updateMany({ _id: { $in: ids } }, { $unset: { lat: '', lng: '' }, $set: { coordSource: 'unknown' } });
    return res.modifiedCount ?? 0;
  },

  // כתובת מהאתר הרשמי של הרשת לסניף שבפורטל אין לו כתובת (data/official-branch-addresses).
  // מיקום אוטומטי ישן מתאפס, כדי שהגיאוקודינג ימקם לפי הכתובת האמיתית. מיקום ידני או
  // מהפורטל נשאר. מחזיר כמה סניפים עודכנו.
  async applyOfficialAddresses(list: Array<{ chainId: string; storeId: string; address: string; city: string }>): Promise<number> {
    let updated = 0;
    for (const a of list) {
      const b = await Branch.findOne({ chainId: a.chainId, storeId: normStoreId(a.storeId) }).lean();
      if (!b || (b.address === a.address && b.city === a.city)) continue;
      const resetCoords = b.coordSource !== 'manual' && b.coordSource !== 'portal';
      await Branch.updateOne({ _id: b._id }, resetCoords
        ? { $set: { address: a.address, city: a.city, coordSource: 'unknown' }, $unset: { lat: '', lng: '' } }
        : { $set: { address: a.address, city: a.city } });
      updated++;
    }
    return updated;
  },

  // איחוד סניף שנשמר פעמיים (מזהה עם ובלי אפסים מובילים): נשאר מסמך אחד עם המזהה
  // האחיד, המיקום הטוב ביותר, ושאר השדות מהעדכני. מחזיר כמה עותקים נמחקו.
  async mergeDuplicateStores(): Promise<number> {
    const all = await Branch.find({}).lean();
    const groups = new Map<string, typeof all>();
    for (const b of all) {
      const k = `${b.chainId}|${normStoreId(b.storeId)}`;
      groups.set(k, [...(groups.get(k) ?? []), b]);
    }
    const rankOf = (b: (typeof all)[number]) =>
      (typeof b.lat === 'number' ? ({ manual: 4, portal: 3, geocoded: 2 } as Record<string, number>)[b.coordSource] ?? 0 : 0);
    const good = (v: unknown) => typeof v === 'string' && v.trim() !== '' && !/^(unknown|0)$/i.test(v.trim());
    let removed = 0;
    for (const [key, docs] of groups) {
      const norm = key.slice(key.indexOf('|') + 1);
      if (docs.length === 1 && docs[0].storeId === norm) continue;
      const time = (d: (typeof docs)[number]) => new Date(d.lastSyncedAt ?? 0).getTime();
      const byRecency = [...docs].sort((a, b) => time(b) - time(a));
      const primary = [...docs].sort((a, b) => rankOf(b) - rankOf(a) || time(b) - time(a))[0];
      const $set: Record<string, unknown> = { storeId: norm };
      for (const f of ['storeName', 'subChainName', 'subChainId', 'storeType', 'address', 'city', 'zipCode', 'openingHours'] as const) {
        const src = byRecency.find(d => good(d[f]));
        if (src) $set[f] = src[f];
      }
      const others = docs.filter(d => String(d._id) !== String(primary._id)).map(d => d._id);
      if (others.length) await Branch.deleteMany({ _id: { $in: others } });
      await Branch.updateOne({ _id: primary._id }, { $set });
      removed += others.length;
    }
    return removed;
  },

  // תיקון שדה עיר: resolve מחזיר את העיר הנכונה, null למחיקה, או undefined להשאיר
  async repairCities(resolve: (b: { storeName: string; city?: string }) => string | null | undefined): Promise<number> {
    let fixed = 0;
    for (const b of await Branch.find({}, { storeName: 1, city: 1 }).lean()) {
      const next = resolve({ storeName: b.storeName, city: b.city });
      if (next === undefined || next === b.city) continue;
      await Branch.updateOne({ _id: b._id }, next === null ? { $unset: { city: '' } } : { $set: { city: next } });
      fixed++;
    }
    return fixed;
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
