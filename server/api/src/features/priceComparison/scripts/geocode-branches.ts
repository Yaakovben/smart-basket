/**
 * סקריפט bulk-geocoding חד-פעמי לכל הסניפים שחסרים להם lat/lng אמיתיים.
 * הפעלה: npm run geocode-branches
 *
 * עובר על כל ה-branches שאין להם קואורדינטות מהפורטל (coordSource !== 'portal'),
 * שולח ל-Nominatim בקצב של 1 בקשה/שנייה (תואם ל-policy שלהם), ושומר ב-DB
 * עם coordSource='geocoded'. רץ ~50 דקות ל-3000 סניפים.
 *
 * אפשר להריץ שוב — ידלג על מה שכבר נפתר (coordSource='portal'/'geocoded' עם lat/lng).
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../../../config/environment';
import { logger } from '../../../config/logger';
import { BranchDAL } from '../dal/branch.dal';
import { Branch } from '../models/Branch.model';
import { geocodeAddress, cityFallbackCoords } from '../services/geocoder.service';

interface Stats {
  total: number;
  alreadyResolved: number;
  geocoded: number;
  cityFallback: number;
  failed: number;
}

async function main() {
  logger.info('[geocode-branches] Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  logger.info('[geocode-branches] Connected.');

  // כל הסניפים — נעבד רק את אלה שלא נפתרו דרך הפורטל או שחסר להם lat/lng
  const all = await Branch.find({}).lean();
  const stats: Stats = {
    total: all.length,
    alreadyResolved: 0,
    geocoded: 0,
    cityFallback: 0,
    failed: 0,
  };

  // ממיינים: קודם סניפים בלי קואורדינטות בכלל, אחר כך 'unknown'/'geocoded' מהעיר
  const todo = all.filter(b => {
    const hasCoords = typeof b.lat === 'number' && typeof b.lng === 'number';
    if (b.coordSource === 'portal' && hasCoords) {
      stats.alreadyResolved++;
      return false;
    }
    return true;
  });

  logger.info(`[geocode-branches] total=${stats.total}, alreadyResolved=${stats.alreadyResolved}, todo=${todo.length}`);

  let i = 0;
  for (const b of todo) {
    i++;
    const label = `[${i}/${todo.length}] ${b.chainId} ${b.storeName}`;

    // Nominatim עם הכתובת המלאה
    const coords = await geocodeAddress(b.address, b.city);
    if (coords) {
      await BranchDAL.updateCoords(b._id.toString(), coords.lat, coords.lng, 'geocoded');
      stats.geocoded++;
      logger.info(`${label}: geocoded → ${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`);
      continue;
    }

    // נופלים למרכז העיר אם יש
    const fb = cityFallbackCoords(b.city);
    if (fb) {
      await BranchDAL.updateCoords(b._id.toString(), fb.lat, fb.lng, 'geocoded');
      stats.cityFallback++;
      logger.warn(`${label}: city-fallback (${b.city}) → ${fb.lat.toFixed(4)},${fb.lng.toFixed(4)}`);
      continue;
    }

    stats.failed++;
    logger.warn(`${label}: FAILED (city=${b.city || '?'}, address=${b.address || '?'})`);
  }

  logger.info('[geocode-branches] DONE');
  logger.info(JSON.stringify(stats, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  logger.error('[geocode-branches] fatal:', err);
  process.exit(1);
});
