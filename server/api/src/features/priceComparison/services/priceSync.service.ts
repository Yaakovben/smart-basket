import {
  osherAdAdapter,
  ramiLevyAdapter,
  yenotBitanAdapter,
  tivTaamAdapter,
  haziHinamAdapter,
  shufersalAdapter,
  keshetAdapter,
  stopMarketAdapter,
  politzerAdapter,
  doralonAdapter,
  normalizeProductName,
  type ChainAdapter,
} from '../chains';
import { PriceDAL, type UpsertPriceInput } from '../dal/price.dal';
import { logger } from '../../../config/logger';

// כל ה-adapters הפעילים - רצים ברצף ב-syncAllChains.
// אם adapter נכשל, השאר ממשיכים.
// Victory, Super-Pharm ו-Hazi-Hinam הישנים השתמשו בפורטלים שונים; הוסרו עד שיתווסף adapter מתאים.
const adapters: ChainAdapter[] = [
  osherAdAdapter,
  ramiLevyAdapter,
  yenotBitanAdapter,
  tivTaamAdapter,
  haziHinamAdapter,
  keshetAdapter,
  stopMarketAdapter,
  politzerAdapter,
  doralonAdapter,
  shufersalAdapter,
];

export interface SyncResult {
  chainId: string;
  chainName: string;
  fetched: number;
  upserted: number;
  elapsedMs: number;
  error?: string;
}

// דיליי בין רשת לרשת - הפורטל מגביל קצב בקשות, ואם שולחים 10 logins ברצף
// הוא סוגר את ההתחברויות המאוחרות יותר. 3 שניות זה מספיק להיראות "אנושי".
const DELAY_BETWEEN_CHAINS_MS = 3000;

// רשימת כל הרשתות הרשומות (ללא תלות אם יש להן נתונים במאגר) -
// משמש ב-UI להציג את כל הרשתות הזמינות, גם אלה שהפורטל שלהן
// לא פרסם היום. מחושב מה-adapters המוגדרים.
export function getRegisteredChains(): Array<{ chainId: string; chainName: string }> {
  return adapters.map(a => ({ chainId: a.chainId, chainName: a.chainName }));
}
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// רענון מחירים לכל הרשתות הפעילות — משמש גם בסקריפט הידני וגם בcron
export async function syncAllChains(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (let i = 0; i < adapters.length; i++) {
    const adapter = adapters[i];
    // דיליי לפני כל adapter חוץ מהראשון - מונע rate limit מהפורטל
    if (i > 0) await sleep(DELAY_BETWEEN_CHAINS_MS);

    const t0 = Date.now();
    logger.info(`[price-sync] ${adapter.chainId}: fetching latest prices...`);

    const result = await adapter.fetchLatestPrices();
    if (result.error) {
      logger.error(`[price-sync] ${adapter.chainId}: fetch error: ${result.error}`);
      results.push({
        chainId: adapter.chainId,
        chainName: adapter.chainName,
        fetched: 0,
        upserted: 0,
        elapsedMs: Date.now() - t0,
        error: result.error,
      });
      continue;
    }

    if (result.items.length === 0) {
      logger.warn(`[price-sync] ${adapter.chainId}: no items to upsert`);
      results.push({
        chainId: adapter.chainId,
        chainName: adapter.chainName,
        fetched: 0,
        upserted: 0,
        elapsedMs: Date.now() - t0,
      });
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
    }

    const elapsedMs = Date.now() - t0;
    logger.info(`[price-sync] ${adapter.chainId}: fetched=${result.items.length}, upserted=${totalUpserted} in ${(elapsedMs / 1000).toFixed(1)}s`);

    results.push({
      chainId: adapter.chainId,
      chainName: adapter.chainName,
      fetched: result.items.length,
      upserted: totalUpserted,
      elapsedMs,
    });
  }

  return results;
}
