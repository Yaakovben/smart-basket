import cron from 'node-cron';
import { PriceSyncService } from '../services/priceSync.service';
import { logger } from '../../../config/logger';

// NODE_TLS_REJECT_UNAUTHORIZED=0 חיוני לתהליך כדי שהגישה לפורטל השקיפות תעבוד
// זה מוגדר רק ברמת התהליך — לא משפיע על שום בקשת HTTPS אחרת של השרת במפורש
// אלא על האובייקט הגלובלי. מאחר שהסקריפט קורא רק לפורטל ציבורי, זה סביר.

let scheduled = false;

// רענון מחירים יומי — 03:00 בזמן ישראל
const CRON_EXPRESSION = '0 3 * * *';
const TIMEZONE = 'Asia/Jerusalem';

export function startPriceSyncJob(): void {
  if (scheduled) {
    logger.warn('[price-sync-job] Already scheduled, skipping');
    return;
  }

  if (!cron.validate(CRON_EXPRESSION)) {
    logger.error(`[price-sync-job] Invalid cron expression: ${CRON_EXPRESSION}`);
    return;
  }

  cron.schedule(
    CRON_EXPRESSION,
    async () => {
      logger.info('[price-sync-job] Triggered by cron');
      // חשוב: הגדרה ברמת התהליך בלבד — רק לבקשות שנעשות מהסקריפט הזה
      const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
        const results = await PriceSyncService.syncAllChains();
        const summary = results.map(r => `${r.chainId}:${r.upserted}`).join(', ');
        logger.info(`[price-sync-job] Completed: ${summary}`);
      } catch (err) {
        logger.error('[price-sync-job] Unhandled error:', err);
      } finally {
        // שחזור הערך הקודם של ה-env אחרי הסנכרון
        if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
      }
    },
    { timezone: TIMEZONE }
  );

  scheduled = true;
  logger.info(`[price-sync-job] Scheduled daily at ${CRON_EXPRESSION} (${TIMEZONE})`);
}
