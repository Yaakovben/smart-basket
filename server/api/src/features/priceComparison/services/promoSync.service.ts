/**
 * סנכרון מבצעים של רשת מקובצי PromoFull.
 *
 * הורדה → פענוח → צבירה → בדיקת תקינות → החלפה. קובץ אחד בכל פעם, והוא משוחרר
 * מהזיכרון מיד אחרי הצבירה (קובץ סניף בשופרסל הוא כ-11MB של XML, ויש 424 כאלה).
 * אם הבדיקה נכשלה, המבצעים הקיימים נשארים כמו שהם.
 */

import { Price, type ChainId } from '../models/Price.model';
import { PromotionDAL } from '../dal/promotion.dal';
import { PriceSyncLogDAL } from '../dal/priceSyncLog.dal';
import { parsePromoBuffer } from '../chains/promoXmlParser';
import { PromoAccumulator } from './promoAggregation';
import { validatePromoFeed } from './syncValidation';
import { logger } from '../../../config/logger';
import type { ChainAdapter } from '../chains/types';

// תקרת קבצים לרשת: שופרסל, הגדולה ביותר, מפרסמת כ-424
const MAX_PROMO_FILES = 600;
// שני קבצים במקביל: מספיק כדי לא לחכות לרשת, בלי להכפיל את שיא הזיכרון
const CONCURRENCY = 2;

// תקלת רשת זמנית (DNS, ניתוק, timeout) בהורדת קובץ: עוד שני ניסיונות. בלי זה תקלת DNS
// של כמה שניות הכשילה 149 מ-157 קובצי המבצעים של דור אלון ברצף
const NETWORK_ERROR = /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|getaddrinfo|socket hang up|timeout of \d+ms/i;
async function downloadWithRetry(download: () => Promise<Buffer>, attempts = 3): Promise<Buffer> {
  for (let i = 0; ; i++) {
    try {
      return await download();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i >= attempts - 1 || !NETWORK_ERROR.test(msg)) throw err;
      await new Promise(r => setTimeout(r, 2000 * 2 ** i));
    }
  }
}

export interface PromoSyncSummary {
  status: 'success' | 'failed' | 'skipped';
  promotions?: number;
  filesOk?: number;
  filesTotal?: number;
  error?: string;
}

export async function syncPromotionsForChain(adapter: ChainAdapter, runId: string): Promise<PromoSyncSummary> {
  const startedAt = new Date();
  const chainId = adapter.chainId as ChainId;
  const tag = `[promo-sync] ${chainId}`;
  const log = PriceSyncLogDAL.record;

  if (!adapter.listPromoFullFiles) {
    await log({ chainId, type: 'promo-full', runId, startedAt, status: 'skipped', error: 'adapter_has_no_promo_support' });
    return { status: 'skipped', error: 'adapter_has_no_promo_support' };
  }

  let files;
  try {
    files = await adapter.listPromoFullFiles();
  } catch (err) {
    const error = `list_failed:${err instanceof Error ? err.message : 'unknown'}`;
    logger.warn(`${tag}: ${error}`);
    await log({ chainId, type: 'promo-full', runId, startedAt, status: 'failed', error });
    return { status: 'failed', error };
  }
  const selected = files.slice(0, MAX_PROMO_FILES);

  const acc = new PromoAccumulator(startedAt);
  let filesOk = 0;
  let lastError: string | undefined;
  for (let i = 0; i < selected.length; i += CONCURRENCY) {
    const batch = selected.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(async f => ({ f, parsed: parsePromoBuffer(await downloadWithRetry(f.download)) })));
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        acc.addFile(r.value.parsed, r.value.f.storeId);
        filesOk++;
      } else {
        lastError = r.reason instanceof Error ? r.reason.message : String(r.reason);
      }
    }
    // משחרר את ה-event loop לבקשות של משתמשים בין קבצים
    await new Promise<void>(r => setImmediate(r));
  }

  // רק ברקודים שיש להם מחיר ברשת: אחרת אין מול מה להשוות את מחיר המבצע
  const knownBarcodes = new Set<string>(await Price.distinct('barcode', { chainId }));
  const { promotions, itemsOverBudget } = acc.finish(knownBarcodes.size > 0 ? knownBarcodes : undefined);
  const previousPromotions = await PromotionDAL.countCurrent(chainId);
  const details = {
    promotionsSeen: acc.stats.promotionsSeen,
    skipped: acc.stats.skipped,
    itemsOverBudget,
    storesWithPromos: acc.storeIds.length,
    previousPromotions,
    filesListed: files.length,
    ...(lastError ? { lastFileError: lastError.slice(0, 200) } : {}),
  };
  const common = {
    chainId, type: 'promo-full' as const, runId, startedAt,
    filesDownloaded: filesOk,
    filesFailed: selected.length - filesOk,
    recordsDownloaded: acc.stats.promotionsSeen,
    recordsUnmatched: acc.stats.itemsWithoutBarcode,
    details,
  };

  const validation = validatePromoFeed({ filesOk, filesTotal: selected.length, promotions: promotions.length, previousPromotions });
  if (!validation.ok) {
    logger.warn(`${tag}: validation failed (${validation.reason}), keeping existing promotions`);
    await log({ ...common, status: 'failed', error: `validation:${validation.reason}` });
    return { status: 'failed', filesOk, filesTotal: selected.length, error: validation.reason };
  }

  try {
    const res = await PromotionDAL.replaceChainPromotions(chainId, promotions, acc.storeIds, runId, startedAt);
    const items = promotions.reduce((s, p) => s + p.items.length, 0);
    logger.info(`${tag}: ${promotions.length} promotions (${items} items) from ${filesOk}/${selected.length} files (inserted=${res.inserted}, deleted=${res.deleted}, overBudget=${itemsOverBudget})`);
    await log({ ...common, status: 'success', recordsInserted: res.inserted, recordsDeleted: res.deleted, details: { ...details, items } });
    return { status: 'success', promotions: promotions.length, filesOk, filesTotal: selected.length };
  } catch (err) {
    const error = `write_failed:${err instanceof Error ? err.message : 'unknown'}`;
    logger.error(`${tag}: ${error}`);
    // שאריות הריצה שלא סומנה כנוכחית לא נקראות, אבל תופסות מקום
    await PromotionDAL.deleteRun(chainId, runId).catch(() => undefined);
    await log({ ...common, status: 'failed', error });
    return { status: 'failed', error };
  }
}
