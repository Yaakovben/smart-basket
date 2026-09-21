/**
 * הקטנת נפח branch_prices (אשכול Atlas חינמי מוגבל ל-512MB).
 *
 * 1. מוריד את האינדקסים הבודדים chainId_1 ו-barcode_1 - האינדקס המורכב הייחודי
 *    (chainId, storeId, barcode) מכסה את כל השאילתות.
 * 2. לכל רשת משאיר רק את הסניפים שנבחרים ע"י selectStoresToPrice
 *    (פיזור גיאוגרפי, תקרה MAX_PRICED_STORES_PER_CHAIN) ומוחק את השאר.
 *
 * הנתון נגזר מהפורטלים - סנכרון הבא יטען שוב רק את הסניפים שנבחרו.
 *
 * הפעלה (אחרי npm run build):
 *   npm run slim-branch-prices            # dry-run: מדפיס מה יקרה, לא כותב
 *   npm run slim-branch-prices -- --apply # מבצע בפועל
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../../../config/environment';
import { Branch } from '../models/Branch.model';
import { BranchPrice } from '../models/BranchPrice.model';
import { selectStoresToPrice } from '../services/storeSelection';
import { normStoreId } from '../services/storeId';

const REDUNDANT_INDEXES = ['chainId_1', 'barcode_1'];
const apply = process.argv.includes('--apply');

async function printStats(label: string) {
  const s = await mongoose.connection.db!.command({ dbStats: 1, scale: 1024 * 1024 });
  console.log(`${label}: storage=${s.storageSize.toFixed(0)}MB index=${s.indexSize.toFixed(0)}MB data=${s.dataSize.toFixed(0)}MB`);
}

async function main() {
  console.log(apply ? '== APPLY: כותב ל-DB ==' : '== DRY-RUN: לא כותב כלום (הוסף --apply לביצוע) ==');
  await mongoose.connect(env.MONGODB_URI);
  await printStats('לפני');

  const existingIndexes = (await BranchPrice.collection.indexes()).map(i => i.name);
  for (const name of REDUNDANT_INDEXES) {
    if (!existingIndexes.includes(name)) { console.log(`אינדקס ${name}: כבר לא קיים`); continue; }
    console.log(`אינדקס ${name}: ${apply ? 'מוריד' : 'יורד'}`);
    if (apply) await BranchPrice.collection.dropIndex(name);
  }

  const chainIds = ((await BranchPrice.distinct('chainId')) as string[]).sort();
  for (const chainId of chainIds) {
    const storeIds = (await BranchPrice.distinct('storeId', { chainId })) as string[];
    const branches = await Branch.find({ chainId }, { storeId: 1, lat: 1, lng: 1, coordSource: 1 }).lean();
    const coords = new Map<string, { lat: number; lng: number }>();
    for (const b of branches) {
      if (typeof b.lat === 'number' && typeof b.lng === 'number' && b.coordSource !== 'unknown') {
        coords.set(normStoreId(b.storeId), { lat: b.lat, lng: b.lng });
      }
    }
    const keep = selectStoresToPrice(storeIds.map(storeId => ({ storeId, ...coords.get(normStoreId(storeId)) })));
    const toDelete = await BranchPrice.countDocuments({ chainId, storeId: { $nin: keep } });
    const total = await BranchPrice.countDocuments({ chainId });
    console.log(`${chainId}: ${storeIds.length} סניפים מתומחרים, נשארים ${keep.length}; שורות ${total} -> ${total - toDelete} (נמחקות ${toDelete})`);
    if (apply && toDelete > 0) await BranchPrice.deleteMany({ chainId, storeId: { $nin: keep } });
  }

  await printStats('אחרי');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('slim-branch-prices failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
