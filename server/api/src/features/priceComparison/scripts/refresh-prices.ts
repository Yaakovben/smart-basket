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
import { env } from '../../../config/environment';
import { logger } from '../../../config/logger';
import { syncAllChains } from '../services/priceSync.service';
import { PriceDAL } from '../dal/price.dal';

async function main() {
  logger.info('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected.');

  const results = await syncAllChains();
  for (const r of results) {
    if (r.error) {
      logger.error(`[${r.chainId}] error: ${r.error}`);
    } else {
      logger.info(`[${r.chainId}] ${r.chainName}: fetched ${r.fetched}, upserted ${r.upserted} in ${(r.elapsedMs / 1000).toFixed(1)}s`);
    }
  }

  const total = await PriceDAL.countByChain('osher_ad');
  logger.info(`Total Osher Ad prices in DB: ${total}`);

  await mongoose.disconnect();
  logger.info('Disconnected.');
}

main().catch(err => {
  logger.error('Fatal error in refresh-prices:', err);
  process.exit(1);
});
