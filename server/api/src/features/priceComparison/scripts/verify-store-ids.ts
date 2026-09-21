/**
 * אבחון (קריאה בלבד): האם מזהי הסניפים באוסף branches תואמים למזהים באוסף
 * branch_prices? התאמת מחיר לסניף הקרוב תלויה בכך. אם ההתאמה נמוכה, המחיר
 * המוצג חוזר להערכה ארצית ולא למחיר בסניף.
 *
 * הפעלה (אחרי npm run build): npm run verify-store-ids
 * הסקריפט לא כותב כלום ל-DB, רק distinct/count.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../../../config/environment';
import { Branch } from '../models/Branch.model';
import { BranchPrice } from '../models/BranchPrice.model';

// זהה לנרמול ב-branches.service: אפסים מובילים לא משנים את הסניף
const norm = (id: string): string => String(id).trim().replace(/^0+(?=.)/, '');
const SAMPLE_SIZE = 3;

async function main() {
  await mongoose.connect(env.MONGODB_URI);

  const chainIds = (await BranchPrice.distinct('chainId')) as string[];
  console.log(`רשתות עם מחירי סניף: ${chainIds.length}\n`);
  console.log('רשת | סניפים | סניפים עם מחיר | התאמה מדויקת | התאמה אחרי נרמול | סניפים עם קואורדינטות');

  for (const chainId of chainIds.sort()) {
    const priceStoreIds = (await BranchPrice.distinct('storeId', { chainId })) as string[];
    const branches = await Branch.find({ chainId }, { storeId: 1, lat: 1, lng: 1, coordSource: 1 }).lean();

    const branchIds = new Set(branches.map(b => b.storeId));
    const branchNorm = new Set(branches.map(b => norm(b.storeId)));
    const exact = priceStoreIds.filter(id => branchIds.has(id)).length;
    const normalized = priceStoreIds.filter(id => branchNorm.has(norm(id))).length;
    const withCoords = branches.filter(b => typeof b.lat === 'number' && typeof b.lng === 'number' && b.coordSource !== 'unknown').length;

    console.log(`${chainId} | ${branches.length} | ${priceStoreIds.length} | ${exact} | ${normalized} | ${withCoords}`);

    if (normalized < priceStoreIds.length) {
      const unmatched = priceStoreIds.filter(id => !branchNorm.has(norm(id))).slice(0, SAMPLE_SIZE);
      console.log(`   דוגמאות מזהי מחיר בלי סניף: ${unmatched.join(', ')}`);
      console.log(`   דוגמאות מזהי סניף: ${branches.slice(0, SAMPLE_SIZE).map(b => b.storeId).join(', ')}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('verify-store-ids failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
