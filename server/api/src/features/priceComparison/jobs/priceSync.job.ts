import cron from 'node-cron';
import { syncAllChains, syncBranchesFromOsm, getRegisteredChains, type SyncResult } from '../services/priceSync.service';
import { Price } from '../models/Price.model';
import { PriceSyncLog } from '../models/PriceSyncLog.model';
import { BranchDAL, type UpsertBranchInput } from '../dal/branch.dal';
import { invalidateBranchCache } from '../services/branches.service';
import { geocodeAddress } from '../services/geocoder.service';
import { coordsConflictWithName, isCountryCentroid } from '../services/cityMatching';
import { KNOWN_BRANCHES } from '../data/known-branches.data';
import { CHAIN_NAMES } from '../data/chain-names.data';
import { logger } from '../../../config/logger';

// כל chain adapter מזריק httpsAgent ייעודי (rejectUnauthorized: false) לבקשות
// שצריכות זאת - ראו chains/insecureAgent.ts. אין יותר ביטול TLS גלובלי על
// process.env כאן, כדי לא להשפיע על בקשות HTTPS אחרות (Google OAuth, Sentry,
// LocationIQ וכו') שרצות באותו תהליך בזמן שהסנכרון פועל.

let scheduled = false;
let syncInProgress = false;

// סנכרון פעם ביום ב-04:00 שעון ישראל - שעה שקטה לחלוטין (בלי לקוחות)
// אחרי שהפורטלים סיימו לפרסם את הקבצים בלילה. הוסר 08:00 - היה גורם
// להאטה ללקוחות שנכנסים בבוקר. התעדכנות אחת ביום מספיקה (המחירים לא
// משתנים תוך כדי יום כך שאין יתרון לסנכרון נוסף).
const CRON_EXPRESSION = '0 4 * * *';
// סבב השלמה: פורטלים שמציגים רק את קובצי היום (ויקטורי ומחסני השוק ב-laibcatalog,
// קרפור) עדיין ריקים ב-04:00 (מחסני השוק מפרסמת PriceFull ב-06:07). ב-10:30 כולן כבר
// פרסמו, ורשת שהסנכרון הלילי שלה נכשל או נחסם בבדיקת התקינות מקבלת עוד סבב.
const CATCH_UP_CRON_EXPRESSION = '30 10 * * *';
const TIMEZONE = 'Asia/Jerusalem';
// אם הנתונים ישנים מ-72 שעות בעת הפעלת השרת, נסנכרן ברקע אחרי 30 דקות.
// 72 שעות (במקום 36) - מונע סנכרון מיותר אחרי deploys תכופים בסוף שבוע.
// 30 דקות עיכוב (במקום 5) - מבטיחים שמשתמשים ראשונים שמעירים את השרת
// יקבלו תגובה מהירה, ושהסנכרון רץ רק כשפעילות שקטה.
const STARTUP_STALENESS_MS = 72 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30 * 60 * 1000;

// פונקציית עזר לרענון - משותפת ל-cron ול-startup
// תקלת רשת זמנית (DNS, ניתוק): הרשת תקבל סבב נוסף אחרי הפסקה. בשרת Render
// תקלת DNS מול פורטל המחירים נמשכה דקות, יותר מהניסיון החוזר הקצר בכל בקשה.
const NETWORK_ERROR = /EAI_AGAIN|ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|getaddrinfo|socket hang up|timeout of \d+ms/i;
const NETWORK_RETRY_DELAY_MS = 2 * 60 * 1000;
const isNetworkFailure = (r: SyncResult) => !!r.error && NETWORK_ERROR.test(r.error);

// פונקציית עזר לרענון - משותפת ל-cron ול-startup. chainIds = רק הרשתות האלה
async function runSync(trigger: 'cron' | 'startup' | 'manual' | 'catch-up', chainIds?: string[]): Promise<void> {
  if (syncInProgress) {
    logger.warn(`[price-sync-job] ${trigger}: sync already in progress, skipping`);
    return;
  }
  syncInProgress = true;
  try {
    logger.info(`[price-sync-job] ${trigger}: starting sync of ${chainIds ? chainIds.join(',') : 'all chains'}`);
    const results = await syncAllChains(chainIds);
    const summary = results.map(r => `${r.chainId}:${r.upserted}${r.error ? '(err)' : ''}`).join(', ');
    logger.info(`[price-sync-job] ${trigger}: completed — ${summary}`);

    const retry = results.filter(isNetworkFailure).map(r => r.chainId);
    if (retry.length > 0) {
      logger.warn(`[price-sync-job] ${trigger}: network failures in ${retry.join(',')}, retrying in ${NETWORK_RETRY_DELAY_MS / 1000}s`);
      await new Promise(r => setTimeout(r, NETWORK_RETRY_DELAY_MS));
      const again = await syncAllChains(retry);
      logger.info(`[price-sync-job] ${trigger}: retry — ${again.map(r => `${r.chainId}:${r.upserted}${r.error ? '(err)' : ''}`).join(', ')}`);
    }
  } catch (err) {
    logger.error(`[price-sync-job] ${trigger}: unhandled error:`, err);
  } finally {
    syncInProgress = false;
  }
}

// רשתות שלא היה להן היום (שעון ישראל) סנכרון מחירים מוצלח, לפי לוג הסנכרון השמור
async function chainsWithoutSuccessToday(): Promise<string[]> {
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
    // תחילת היום בשעון ישראל, בקירוב של שעתיים לכיוון המוקדם (בלי תלות בשעון קיץ)
    const since = new Date(`${today}T00:00:00Z`);
    since.setUTCHours(since.getUTCHours() - 3);
    const ok = await PriceSyncLog.distinct('chainId', { type: 'price-full', status: 'success', startedAt: { $gte: since } });
    const done = new Set<string>(ok);
    return getRegisteredChains().map(c => c.chainId).filter(id => !done.has(id));
  } catch (err) {
    logger.error('[price-sync-job] catch-up: failed to read sync logs:', err);
    return [];
  }
}

// הרשתות שצריכות סנכרון בעליית השרת: בלי מחירים בכלל, או שהעדכון האחרון שלהן
// ישן. נבדק לכל רשת בנפרד: בעבר נבדק רק המחיר העדכני מכל הרשתות יחד, ולכן רשת
// אחת שעודכנה הסתירה רשתות שמעולם לא נטענו (ויקטורי, מעיין 2000, סופר ספיר...).
async function staleChainsAtStartup(): Promise<string[]> {
  try {
    const latest = await Price.aggregate<{ _id: string; last: Date }>([
      { $group: { _id: '$chainId', last: { $max: '$updatedAt' } } },
    ]);
    const lastByChain = new Map(latest.map(l => [l._id, new Date(l.last).getTime()]));
    const stale = getRegisteredChains()
      .map(c => c.chainId)
      .filter(id => {
        const last = lastByChain.get(id);
        return last === undefined || Date.now() - last > STARTUP_STALENESS_MS;
      });
    logger.info(`[price-sync-job] Startup: ${stale.length} chains missing or stale${stale.length ? `: ${stale.join(',')}` : ''}`);
    return stale;
  } catch (err) {
    logger.error('[price-sync-job] Startup: failed to check staleness, skipping auto-sync:', err);
    return [];
  }
}

// טעינת KNOWN_BRANCHES (seed ידני) - idempotent, רץ ב-startup ובכל cron.
// ככה רשתות חדשות שנוספו לקוד נכנסות אוטומטית למאגר בלי דריסה ידנית.
async function reloadSeedBranches(trigger: 'cron' | 'startup'): Promise<void> {
  try {
    const chainNames = CHAIN_NAMES;
    const inputs: UpsertBranchInput[] = KNOWN_BRANCHES.map(b => ({
      chainId: b.chainId,
      chainName: chainNames[b.chainId] || b.chainId,
      storeId: b.storeId,
      storeName: b.storeName,
      address: b.address,
      city: b.city,
      lat: b.lat,
      lng: b.lng,
      coordSource: 'portal' as const,
    }));
    const upserted = await BranchDAL.bulkUpsert(inputs);
    invalidateBranchCache();
    logger.info(`[seed-branches] ${trigger}: ${upserted}/${inputs.length} known branches loaded/updated`);
  } catch (err) {
    logger.error(`[seed-branches] ${trigger}: failed:`, err);
  }
}

// ניקוי מחירים ישנים מהמאגר - מונע ניפוח DB ב-Atlas Free.
// הסיבה שלא משתמשים ב-TTL index: כשבונים TTL על קולקציה גדולה, MongoDB
// נועלת אותה ל-mins רבות עד שהאינדקס נבנה - זה הפיל לנו את הפרודקשן.
// במקום זה: מחיקה ידנית בbatches של 1000, בשעה שקטה (אחרי הסנכרון).
// אין נעילה, אין גל עומס - בקרה מלאה.
const CLEANUP_OLDER_THAN_DAYS = 14;
const CLEANUP_BATCH_SIZE = 1000;
const CLEANUP_MAX_BATCHES = 100; // עד 100K מסמכים בריצה - די לכל יום

async function cleanupOldPrices(trigger: 'cron' | 'manual' = 'manual'): Promise<{ deleted: number }> {
  const result = await cleanupOldPricesImpl(trigger);
  return result;
}

async function cleanupOldPricesImpl(trigger: 'cron' | 'manual'): Promise<{ deleted: number }> {
  try {
    const cutoff = new Date(Date.now() - CLEANUP_OLDER_THAN_DAYS * 24 * 60 * 60 * 1000);
    let totalDeleted = 0;
    for (let batch = 0; batch < CLEANUP_MAX_BATCHES; batch++) {
      // שליפת ID של batch ישנים (לא מחיקה ב-deleteMany ישיר על כולם בבת אחת)
      const oldDocs = await Price
        .find({ updatedAt: { $lt: cutoff } }, { _id: 1 })
        .limit(CLEANUP_BATCH_SIZE)
        .lean();
      if (oldDocs.length === 0) break;
      const ids = oldDocs.map(d => d._id);
      const res = await Price.deleteMany({ _id: { $in: ids } });
      totalDeleted += res.deletedCount || 0;
      if (oldDocs.length < CLEANUP_BATCH_SIZE) break;
      // השהיה קצרה בין batches - נותן לDB אוויר לבקשות אחרות
      await new Promise(r => setTimeout(r, 200));
    }
    if (totalDeleted > 0) {
      logger.info(`[price-cleanup] ${trigger}: deleted ${totalDeleted} prices older than ${CLEANUP_OLDER_THAN_DAYS} days`);
    }
    return { deleted: totalDeleted };
  } catch (err) {
    logger.error(`[price-cleanup] ${trigger}: failed:`, err);
    return { deleted: 0 };
  }
}

// Geocoding לילי - משלים קואורדינטות אמיתיות לסניפים עם כתובת בלי lat/lng.
// רץ ברקע אחרי סנכרון, מוגבל ל-200 סניפים לריצה (Nominatim 1 req/s, עד כמה וריאציות
// כתובת לסניף: כ-10 דקות). הוגדל מ-50 כשנוספו כ-450 סניפים חדשים בלי מיקום מהפורטלים.
// אפס השפעה על בקשות משתמש - יוצא מתהליך הקרון.
const GEOCODE_BATCH_LIMIT = 200;

async function runNightlyGeocode(trigger: 'cron' | 'startup' | 'catch-up'): Promise<void> {
  try {
    // קודם מאפסים מיקומים שגויים שנשמרו בעבר, כדי שייכנסו לגיאוקודינג מחדש
    const reset = await BranchDAL.resetInvalidGeocodedCoords(b => isCountryCentroid(b.lat, b.lng) || coordsConflictWithName(b.lat, b.lng, b.storeName));
    if (reset > 0) {
      invalidateBranchCache();
      logger.info(`[geocode-nightly] ${trigger}: reset ${reset} invalid geocoded coordinates`);
    }
    const missing = await BranchDAL.findMissingCoords(GEOCODE_BATCH_LIMIT);
    if (missing.length === 0) {
      logger.info(`[geocode-nightly] ${trigger}: nothing to geocode`);
      return;
    }
    let success = 0;
    let skipped = 0;
    for (const b of missing) {
      if (!b.address && !b.city) { skipped++; continue; }
      // שם הסניף: רמז לעיר כשהשדה city הוא קוד מספרי, ובדיקה שהתוצאה לא סותרת אותו
      const coords = await geocodeAddress(b.address, b.city, b.storeName);
      if (coords) {
        const idStr = (b as { _id: { toString(): string } })._id.toString();
        await BranchDAL.updateCoords(idStr, coords.lat, coords.lng, 'geocoded');
        success++;
      } else {
        skipped++;
      }
    }
    invalidateBranchCache();
    logger.info(`[geocode-nightly] ${trigger}: geocoded ${success}/${missing.length} (skipped ${skipped})`);
  } catch (err) {
    logger.error(`[geocode-nightly] ${trigger}: failed:`, err);
  }
}

// סנכרון סניפים מ-OSM - אוטומטי בעת boot אם המאגר ריק, ובכל cron run.
// רץ בנפרד מסנכרון המחירים כדי לא לעכב, ובלי NODE_TLS_REJECT_UNAUTHORIZED
// (הפרסום של OSM הוא HTTPS תקני).
async function runOsmBranchSync(trigger: 'cron' | 'startup'): Promise<void> {
  try {
    const results = await syncBranchesFromOsm();
    const total = results.reduce((s, r) => s + r.upserted, 0);
    logger.info(`[osm-sync-job] ${trigger}: ${total} branches upserted across ${results.length} chains`);
  } catch (err) {
    logger.error(`[osm-sync-job] ${trigger}: failed:`, err);
  }
}

export function startPriceSyncJob(): void {
  if (scheduled) {
    logger.warn('[price-sync-job] Already scheduled, skipping');
    return;
  }

  if (!cron.validate(CRON_EXPRESSION)) {
    logger.error(`[price-sync-job] Invalid cron expression: ${CRON_EXPRESSION}`);
    return;
  }

  // cron של מחירים + seeds + סנכרון סניפים מ-OSM (פעם ביום ב-04:00 בלבד).
  // הסדר: מחירים → seed branches (תקין-תמיד) → OSM (העשרה).
  cron.schedule(
    CRON_EXPRESSION,
    async () => {
      await runSync('cron');
      await reloadSeedBranches('cron');
      await runOsmBranchSync('cron');
      // ניקוי מחירים ישנים - מונע ניפוח DB
      await cleanupOldPrices('cron');
      // Geocoding ברקע - משלים קואורדינטות אמיתיות לסניפים עם כתובת בלבד
      await runNightlyGeocode('cron');
    },
    { timezone: TIMEZONE }
  );

  cron.schedule(
    CATCH_UP_CRON_EXPRESSION,
    async () => {
      const pending = await chainsWithoutSuccessToday();
      if (pending.length === 0) {
        logger.info('[price-sync-job] catch-up: all chains synced today');
        return;
      }
      await runSync('catch-up', pending);
      await runNightlyGeocode('catch-up');
    },
    { timezone: TIMEZONE }
  );

  scheduled = true;
  logger.info(`[price-sync-job] Scheduled: ${CRON_EXPRESSION} (${TIMEZONE}) — once daily at 04:00`);

  // ===== Startup actions =====
  // 1. סנכרון מחירים ב-boot רק אם הנתונים ישנים מאוד (72 שעות+) ואחרי 30 דקות
  //    כדי לא להפריע ללקוחות שנכנסים בזמן ה-boot. אם המשתמש שמעיר את השרת
  //    כבר סיים, הסנכרון לא משפיע על אף אחד.
  void staleChainsAtStartup().then(stale => {
    if (stale.length > 0) {
      logger.info(`[price-sync-job] Startup: scheduling sync of ${stale.length} chains in ${STARTUP_DELAY_MS / 60000} minutes`);
      // אחרי הסנכרון: מיקום לסניפים החדשים, כדי שיופיעו ב"קרוב אליך" בלי לחכות ללילה
      setTimeout(() => { void runSync('startup', stale).then(() => runNightlyGeocode('startup')); }, STARTUP_DELAY_MS);
    }
  });

  // 2. seed של סניפים מיידית (מהיר, לא מעמיס).
  void reloadSeedBranches('startup');
}
