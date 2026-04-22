import { osherAdAdapter, normalizeProductName, type ChainAdapter } from '../chains';
import { PriceDAL, type UpsertPriceInput } from '../dal/price.dal';
import { logger } from '../../../config/logger';

const adapters: ChainAdapter[] = [osherAdAdapter];

export interface SyncResult {
  chainId: string;
  chainName: string;
  fetched: number;
  upserted: number;
  elapsedMs: number;
  error?: string;
}

// רענון מחירים לכל הרשתות הפעילות — משמש גם בסקריפט הידני וגם בcron
export async function syncAllChains(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const adapter of adapters) {
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
