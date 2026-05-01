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

// סנכרון פעמיים ביום ב-04:00 וב-16:00 שעון ישראל. הפורטל מעדכן בעיקר בלילה,
// 04:00 נותן זמן לכל הרשתות לפרסם ולפני הפעילות הבוקרית של המשתמשים.
// ריצה אחת ביום: עומס מינימלי על השרת + נתונים טריים לכל היום.
const CRON_EXPRESSION = '0 4,16 * * *';
const TIMEZONE = 'Asia/Jerusalem';
// אם הנתונים ישנים מ-24 שעות בעת הפעלת השרת, נסנכרן מיד ברקע
const STARTUP_STALENESS_MS = 24 * 60 * 60 * 1000;

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

// טעינת KNOWN_BRANCHES (seed ידני) - idempotent, רץ ב-startup ובכל cron.
// ככה רשתות חדשות שנוספו לקוד נכנסות אוטומטית למאגר בלי דריסה ידנית.
async function reloadSeedBranches(trigger: 'cron' | 'startup'): Promise<void> {
  try {
    const chainNames: Record<string, string> = {
      shufersal: 'שופרסל', rami_levy: 'רמי לוי', yohananof: 'יוחננוף',
      osher_ad: 'אושר עד', tiv_taam: 'טיב טעם', keshet: 'קשת',
      stop_market: 'סטופ מרקט', politzer: 'פוליצר', doralon: 'דור אלון',
      victory: 'ויקטורי', maayan_2000: 'מעיין 2000',
      shefa_birkat_hashem: 'שפע ברכת השם', super_sapir: 'סופר ספיר',
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
    logger.info(`[seed-branches] ${trigger}: ${upserted}/${inputs.length} known branches loaded/updated`);
  } catch (err) {
    logger.error(`[seed-branches] ${trigger}: failed:`, err);
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

  // cron של מחירים + seeds + סנכרון סניפים מ-OSM (פעמיים ביום ב-04:00 וב-16:00).
  // הסדר: מחירים → seed branches (תקין-תמיד) → OSM (העשרה).
  cron.schedule(
    CRON_EXPRESSION,
    async () => {
      await runSync('cron');
      await reloadSeedBranches('cron');
      await runOsmBranchSync('cron');
    },
    { timezone: TIMEZONE }
  );

  scheduled = true;
  logger.info(`[price-sync-job] Scheduled: ${CRON_EXPRESSION} (${TIMEZONE}) — twice daily at 04:00 and 16:00`);

  // ===== Startup actions =====
  // 1. אם המחירים ישנים - סנכרון מחירים מיידי
  void shouldRunStartupSync().then(shouldRun => {
    if (shouldRun) {
      setTimeout(() => runSync('startup'), 15_000);
    }
  });

  // 2. seed של סניפים בעת boot, ואז OSM להעשרה.
  void (async () => {
    await reloadSeedBranches('startup');
    const branchCount = await BranchDAL.count({});
    if (branchCount < 100) {
      setTimeout(() => runOsmBranchSync('startup'), 30_000);
    }
  })();
}
