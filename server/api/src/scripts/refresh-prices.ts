/**
 * סקריפט עדכון ידני של מחירים מרשתות.
 * הפעלה: npm run refresh-prices
 *
 * מתחבר ל-MongoDB, מושך מחירים מכל ה-adapters הפעילים, וממיר לשורות במסד.
 *
 * NODE_TLS_REJECT_UNAUTHORIZED=0 מושבת עבור תהליך הסקריפט בלבד — פורטל השקיפות
 * של הממשלה הציבורי מגיש תעודה שלא תמיד עוברת אימות ב-Node, והנתונים ציבוריים
 * לגמרי ולא רגישים.
 */

// חייב להיות לפני imports של axios כדי שייכנס לתוקף בכל הבקשות
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/environment';
import { logger } from '../config/logger';
import { osherAdAdapter } from '../chains';
import { PriceDAL } from '../dal';
import { normalizeProductName } from '../chains';
import type { UpsertPriceInput } from '../dal';

const adapters = [osherAdAdapter];

async function main() {
  logger.info('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected.');

  for (const adapter of adapters) {
    logger.info(`[${adapter.chainId}] Fetching latest prices...`);
    const t0 = Date.now();
    const result = await adapter.fetchLatestPrices();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (result.error) {
      logger.error(`[${adapter.chainId}] Fetch error: ${result.error}`);
      continue;
    }
    logger.info(`[${adapter.chainId}] Fetched ${result.items.length} items in ${elapsed}s. Upserting to DB...`);

    if (result.items.length === 0) {
      logger.warn(`[${adapter.chainId}] No items to upsert, skipping.`);
      continue;
    }

    const inputs: UpsertPriceInput[] = result.items.map(item => ({
      barcode: item.barcode,
      itemName: item.itemName,
      itemNameNormalized: normalizeProductName(item.itemName),
      chainId: adapter.chainId,
      chainName: adapter.chainName,
      storeId: item.storeId,
      price: item.price,
      unitOfMeasure: item.unitOfMeasure,
      manufacturerName: item.manufacturerName,
      quantity: item.quantity,
    }));

    const BATCH_SIZE = 500;
    let totalUpserted = 0;
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = inputs.slice(i, i + BATCH_SIZE);
      const affected = await PriceDAL.bulkUpsert(batch);
      totalUpserted += affected;
      if ((i / BATCH_SIZE) % 10 === 0) {
        logger.info(`[${adapter.chainId}] Progress: ${i + batch.length}/${inputs.length}`);
      }
    }
    logger.info(`[${adapter.chainId}] Done. ${totalUpserted} rows upserted.`);
  }

  const totalOsher = await PriceDAL.countByChain('osher_ad');
  logger.info(`Total Osher Ad prices in DB: ${totalOsher}`);

  await mongoose.disconnect();
  logger.info('Disconnected.');
}

main().catch(err => {
  logger.error('Fatal error in refresh-prices:', err);
  process.exit(1);
});
