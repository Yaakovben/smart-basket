/**
 * סקריפט חד-פעמי: ממלא כתובת/עיר לסניפים שיש להם lat/lng אבל אין להם כתובת.
 * תופעה נפוצה ב-osher_ad ו-rami_levy: הפורטל מספק קואורדינטות בלי טקסט כתובת.
 *
 * הפעלה: npm run fill-addresses
 *
 * משתמש ב-reverseGeocode (LocationIQ → Nominatim) לקבל את הרחוב/עיר. שומר ב-DB
 * רק את השדות שהיו ריקים - לא דורס נתון קיים.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../../../config/environment';
import { logger } from '../../../config/logger';
import { Branch } from '../models/Branch.model';
import { reverseGeocode } from '../services/geocoder.service';

interface Stats {
  scanned: number;
  filledAddress: number;
  filledCity: number;
  failed: number;
}

async function main() {
  logger.info('[fill-addresses] Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  logger.info('[fill-addresses] Connected.');

  // סניפים עם קואורדינטות אבל בלי כתובת או בלי עיר
  const branches = await Branch.find({
    lat: { $ne: null },
    lng: { $ne: null },
    $or: [
      { address: { $exists: false } }, { address: '' }, { address: null },
      { city: { $exists: false } }, { city: '' }, { city: null },
    ],
  }).lean();

  logger.info(`[fill-addresses] found ${branches.length} branches needing address`);

  const stats: Stats = { scanned: 0, filledAddress: 0, filledCity: 0, failed: 0 };

  let i = 0;
  for (const b of branches) {
    i++;
    stats.scanned++;
    const label = `[${i}/${branches.length}] ${b.chainId} ${b.storeName}`;

    if (typeof b.lat !== 'number' || typeof b.lng !== 'number') {
      stats.failed++;
      continue;
    }

    const result = await reverseGeocode(b.lat, b.lng);
    if (!result) {
      stats.failed++;
      logger.warn(`${label}: reverse failed (${b.lat.toFixed(4)},${b.lng.toFixed(4)})`);
      continue;
    }

    // עדכון רק שדות ריקים - לא דורסים נתון אמיתי שכבר קיים.
    const update: Record<string, string> = {};
    if (!b.address && result.address) {
      update.address = result.address;
      stats.filledAddress++;
    }
    if (!b.city && result.city) {
      update.city = result.city;
      stats.filledCity++;
    }
    if (Object.keys(update).length > 0) {
      await Branch.updateOne({ _id: b._id }, { $set: update });
      logger.info(`${label}: ${Object.entries(update).map(([k, v]) => `${k}="${v}"`).join(', ')}`);
    } else {
      logger.warn(`${label}: reverse returned nothing useful`);
      stats.failed++;
    }
  }

  logger.info('[fill-addresses] DONE');
  logger.info(JSON.stringify(stats, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  logger.error('[fill-addresses] fatal:', err);
  process.exit(1);
});
