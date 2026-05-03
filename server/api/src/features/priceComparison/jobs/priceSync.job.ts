import cron from 'node-cron';
import { syncAllChains, syncBranchesFromOsm } from '../services/priceSync.service';
import { PriceDAL } from '../dal/price.dal';
import { Price } from '../models/Price.model';
import { BranchDAL, type UpsertBranchInput } from '../dal/branch.dal';
import { invalidateBranchCache } from '../services/branches.service';
import { KNOWN_BRANCHES } from '../data/known-branches.data';
import { logger } from '../../../config/logger';

// NODE_TLS_REJECT_UNAUTHORIZED=0 חיוני לתהליך כדי שהגישה לפורטל השקיפות תעבוד.
// מוגדר רק בזמן הריצה של הסנכרון, משוחזר אחרי.

let scheduled = false;
let syncInProgress = false;

// סנכרון פעם ביום ב-04:00 שעון ישראל - שעה שקטה לחלוטין (בלי לקוחות)
// אחרי שהפורטלים סיימו לפרסם את הקבצים בלילה. הוסר 08:00 - היה גורם
// להאטה ללקוחות שנכנסים בבוקר. התעדכנות אחת ביום מספיקה (המחירים לא
// משתנים תוך כדי יום כך שאין יתרון לסנכרון נוסף).
const CRON_EXPRESSION = '0 4 * * *';
const TIMEZONE = 'Asia/Jerusalem';
// אם הנתונים ישנים מ-72 שעות בעת הפעלת השרת, נסנכרן ברקע אחרי 30 דקות.
// 72 שעות (במקום 36) - מונע סנכרון מיותר אחרי deploys תכופים בסוף שבוע.
// 30 דקות עיכוב (במקום 5) - מבטיחים שמשתמשים ראשונים שמעירים את השרת
// יקבלו תגובה מהירה, ושהסנכרון רץ רק כשפעילות שקטה.
const STARTUP_STALENESS_MS = 72 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 30 * 60 * 1000;

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

// ניקוי מחירים ישנים מהמאגר - מונע ניפוח DB ב-Atlas Free.
// הסיבה שלא משתמשים ב-TTL index: כשבונים TTL על קולקציה גדולה, MongoDB
// נועלת אותה ל-mins רבות עד שהאינדקס נבנה - זה הפיל לנו את הפרודקשן.
// במקום זה: מחיקה ידנית בbatches של 1000, בשעה שקטה (אחרי הסנכרון).
// אין נעילה, אין גל עומס - בקרה מלאה.
const CLEANUP_OLDER_THAN_DAYS = 14;
const CLEANUP_BATCH_SIZE = 1000;
const CLEANUP_MAX_BATCHES = 100; // עד 100K מסמכים בריצה - די לכל יום

export async function cleanupOldPrices(trigger: 'cron' | 'manual' = 'manual'): Promise<{ deleted: number }> {
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
      // ניקוי מחירים ישנים בסוף - אחרי שהסנכרון עדכן את הטריים, נמחק את
      // הישנים. מונע ניפוח DB ב-Atlas Free.
      await cleanupOldPrices('cron');
    },
    { timezone: TIMEZONE }
  );

  scheduled = true;
  logger.info(`[price-sync-job] Scheduled: ${CRON_EXPRESSION} (${TIMEZONE}) — once daily at 04:00`);

  // ===== Startup actions =====
  // 1. סנכרון מחירים ב-boot רק אם הנתונים ישנים מאוד (72 שעות+) ואחרי 30 דקות
  //    כדי לא להפריע ללקוחות שנכנסים בזמן ה-boot. אם המשתמש שמעיר את השרת
  //    כבר סיים, הסנכרון לא משפיע על אף אחד.
  void shouldRunStartupSync().then(shouldRun => {
    if (shouldRun) {
      logger.info('[price-sync-job] Startup: data stale 72h+, scheduling sync in 30 minutes');
      setTimeout(() => runSync('startup'), STARTUP_DELAY_MS);
    }
  });

  // 2. seed של סניפים מיידית (מהיר, לא מעמיס).
  void reloadSeedBranches('startup');
}
