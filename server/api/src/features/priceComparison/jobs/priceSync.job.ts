import cron from 'node-cron';
import { syncAllChains, syncBranchesFromOsm } from '../services/priceSync.service';
import { PriceDAL } from '../dal/price.dal';
import { BranchDAL, type UpsertBranchInput } from '../dal/branch.dal';
import { invalidateBranchCache } from '../services/branches.service';
import { KNOWN_BRANCHES } from '../data/known-branches.data';
import { logger } from '../../../config/logger';

// NODE_TLS_REJECT_UNAUTHORIZED=0 חיוני לתהליך כדי שהגישה לפורטל השקיפות תעבוד.
// מוגדר רק בזמן הריצה של הסנכרון, משוחזר אחרי.

let scheduled = false;
let syncInProgress = false;

// סנכרון כל 6 שעות (00:00 / 06:00 / 12:00 / 18:00 זמן ישראל). הפורטל מעדכן
// בעיקר בלילה, אבל תיקונים יכולים להגיע גם במהלך היום. 4 ריצות ביום שומרות
// על נתונים טריים במשך כל היום עם עומס סביר על השרת.
const CRON_EXPRESSION = '0 */6 * * *';
const TIMEZONE = 'Asia/Jerusalem';
// אם הנתונים ישנים מ-6 שעות בעת הפעלת השרת, נסנכרן מיד ברקע
const STARTUP_STALENESS_MS = 6 * 60 * 60 * 1000;

// פונקציית עזר לרענון עם טיפול ב-TLS env var - משותפת ל-cron ול-startup
async function runSync(trigger: 'cron' | 'startup' | 'manual'): Promise<void> {
  if (syncInProgress) {
    logger.warn(`[price-sync-job] ${trigger}: sync already in progress, skipping`);
    return;
  }
  syncInProgress = true;
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    logger.info(`[price-sync-job] ${trigger}: starting sync of all chains`);
    const results = await syncAllChains();
    const summary = results.map(r => `${r.chainId}:${r.upserted}${r.error ? '(err)' : ''}`).join(', ');
    logger.info(`[price-sync-job] ${trigger}: completed — ${summary}`);
  } catch (err) {
    logger.error(`[price-sync-job] ${trigger}: unhandled error:`, err);
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    syncInProgress = false;
  }
}

// בדיקה אם הנתונים ישנים ומצריכים סנכרון מיידי (ב-boot)
async function shouldRunStartupSync(): Promise<boolean> {
  try {
    // מחפשים את הרשומה העדכנית ביותר בכל רשת
    const latest = await PriceDAL.findOne({}, { sort: { updatedAt: -1 } });
    if (!latest) {
      logger.info('[price-sync-job] Startup: no prices in DB, will trigger initial sync');
      return true;
    }
    const ageMs = Date.now() - new Date(latest.updatedAt).getTime();
    const ageHours = ageMs / (60 * 60 * 1000);
    const stale = ageMs > STARTUP_STALENESS_MS;
    logger.info(`[price-sync-job] Startup: latest price age=${ageHours.toFixed(1)}h, stale=${stale}`);
    return stale;
  } catch (err) {
    logger.error('[price-sync-job] Startup: failed to check staleness, skipping auto-sync:', err);
    return false;
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

  // cron של מחירים + סנכרון סניפים מ-OSM (כל 6 שעות, OSM רץ אחרי המחירים)
  cron.schedule(
    CRON_EXPRESSION,
    async () => {
      await runSync('cron');
      await runOsmBranchSync('cron');
    },
    { timezone: TIMEZONE }
  );

  scheduled = true;
  logger.info(`[price-sync-job] Scheduled: ${CRON_EXPRESSION} (${TIMEZONE}) — every 6 hours`);

  // ===== Startup actions =====
  // 1. אם המחירים ישנים - סנכרון מחירים מיידי
  void shouldRunStartupSync().then(shouldRun => {
    if (shouldRun) {
      setTimeout(() => runSync('startup'), 15_000);
    }
  });

  // 2. תמיד טוען את ה-seed של הסניפים המובילים בעת boot. ה-storeIds
  // ייחודיים (sf-tlv-dizengoff וכו') ולא מתנגשים עם סניפים מ-OSM
  // (osm-node-XXX), אז זו פעולת idempotent - מבטיחה שהסניפים המרכזיים
  // קיימים תמיד גם אם OSM נכשל פעם או שמישהו מחק אותם בטעות.
  void (async () => {
    try {
      const chainNames: Record<string, string> = {
        shufersal: 'שופרסל', rami_levy: 'רמי לוי', yohananof: 'יוחננוף',
        osher_ad: 'אושר עד', tiv_taam: 'טיב טעם', keshet: 'קשת',
        stop_market: 'סטופ מרקט', politzer: 'פוליצר', doralon: 'דור אלון',
      };
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
      logger.info(`[branches] Startup: ${upserted} known branches loaded/updated`);

      // אחרי ה-seed - OSM רץ ברקע להעשיר (לא חוסם, ולא קריטי אם נכשל)
      const branchCount = await BranchDAL.count({});
      if (branchCount < 100) {
        // אם יש לנו רק את ה-seed (~65) ננסה גם OSM להוסיף עוד
        setTimeout(() => runOsmBranchSync('startup'), 30_000);
      }
    } catch (err) {
      logger.error('[branches] Startup: failed to load seed:', err);
    }
  })();
}
