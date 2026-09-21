/**
 * אבחון (קריאה בלבד): כמה מהסניפים שסונכרנו בפיד המחירים (chain_price_coverage)
 * מתאימים לסניפים באוסף branches, ומה נפח חריגות המחיר השמורות בתוך מסמכי prices (storePrices).
 *
 * התאמה בין הפיד לקובץ הסניפים קובעת אם הסניף הקרוב למשתמש מקבל מחיר מאומת.
 * אם ההתאמה נמוכה, המחיר חוזר להערכה ברמת הרשת.
 *
 * הפעלה (אחרי npm run build): npm run verify-store-ids
 * הסקריפט לא כותב כלום ל-DB, רק distinct/count.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../../../config/environment';
import { Branch } from '../models/Branch.model';
import { Price } from '../models/Price.model';
import { ChainPriceCoverage } from '../models/ChainPriceCoverage.model';
import { normStoreId } from '../services/storeId';

const SAMPLE_SIZE = 3;

async function main() {
  await mongoose.connect(env.MONGODB_URI);

  const coverage = await ChainPriceCoverage.find({}).lean();
  console.log(`רשתות שסונכרנו עם מחירי סניף: ${coverage.length}\n`);
  console.log('רשת | סניפים בפיד | סניפים בקובץ הסניפים | תואמים | תואמים עם קואורדינטות | חריגות מחיר | סונכרן');

  for (const doc of coverage.sort((a, b) => a.chainId.localeCompare(b.chainId))) {
    const branches = await Branch.find({ chainId: doc.chainId }, { storeId: 1, lat: 1, lng: 1, coordSource: 1 }).lean();
    const branchByNorm = new Map(branches.map(b => [normStoreId(b.storeId), b]));
    const matched = doc.storeIds.filter(id => branchByNorm.has(normStoreId(id)));
    const withCoords = matched.filter(id => {
      const b = branchByNorm.get(normStoreId(id))!;
      return typeof b.lat === 'number' && typeof b.lng === 'number' && b.coordSource !== 'unknown';
    });
    const agg = await Price.aggregate([
      { $match: { chainId: doc.chainId } },
      { $group: { _id: null, n: { $sum: { $size: { $ifNull: ['$storePrices', []] } } } } },
    ]);
    const exceptionRows = agg[0]?.n ?? 0;

    console.log(`${doc.chainId} | ${doc.storeIds.length} | ${branches.length} | ${matched.length} | ${withCoords.length} | ${exceptionRows} | ${doc.syncedAt.toISOString().slice(0, 16)}`);

    if (matched.length < doc.storeIds.length) {
      const unmatched = doc.storeIds.filter(id => !branchByNorm.has(normStoreId(id))).slice(0, SAMPLE_SIZE);
      console.log(`   דוגמאות מזהי פיד בלי סניף: ${unmatched.join(', ')}`);
      console.log(`   דוגמאות מזהי סניף: ${branches.slice(0, SAMPLE_SIZE).map(b => b.storeId).join(', ')}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('verify-store-ids failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
