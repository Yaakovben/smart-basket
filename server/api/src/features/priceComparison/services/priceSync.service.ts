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
  maayan2000Adapter,
  normalizeProductName,
  type ChainAdapter,
} from '../chains';
import { PriceDAL, type UpsertPriceInput } from '../dal/price.dal';
import { BranchDAL, type UpsertBranchInput } from '../dal/branch.dal';
import { geocodeAddress, cityFallbackCoords } from './geocoder.service';
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
  maayan2000Adapter,
];

export interface SyncResult {
  chainId: string;
  chainName: string;
  fetched: number;
  upserted: number;
  elapsedMs: number;
  error?: string;
  // מידע נלווה של סניפים שנסנכרנו עם המחירים (אופציונלי - רק אם ה-adapter תומך)
  storesFetched?: number;
  storesUpserted?: number;
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

// תוצאות הסנכרון האחרון לכל רשת, נשמרות בזיכרון לצפייה באדמין.
// נמחקות על restart של השרת (זה בסדר - נטענות שוב בסנכרון הבא).
const lastSyncResults = new Map<string, SyncResult & { completedAt: string }>();

export function getLastSyncResults(): Array<SyncResult & { completedAt: string }> {
  return Array.from(lastSyncResults.values());
}

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
      const r: SyncResult = { chainId: adapter.chainId, chainName: adapter.chainName, fetched: 0, upserted: 0, elapsedMs: Date.now() - t0, error: result.error };
      results.push(r);
      lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
      continue;
    }

    if (result.items.length === 0) {
      logger.warn(`[price-sync] ${adapter.chainId}: no items to upsert`);
      const r: SyncResult = { chainId: adapter.chainId, chainName: adapter.chainName, fetched: 0, upserted: 0, elapsedMs: Date.now() - t0, error: 'no_items_found' };
      results.push(r);
      lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
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

    // לאחר סנכרון המחירים - אם ה-adapter תומך, מושכים גם את רשימת הסניפים
    // הרשמית (Stores*.xml) ומעדכנים את טבלת Branch. זה מה שמזין את המרחק/ניווט
    // ב-UI. סניפים ללא lat/lng בקובץ עוברים geocoding דרך Nominatim.
    let storesFetched: number | undefined;
    let storesUpserted: number | undefined;
    if (adapter.fetchLatestStores) {
      try {
        const storesResult = await adapter.fetchLatestStores();
        if (storesResult.error || storesResult.stores.length === 0) {
          logger.warn(`[price-sync] ${adapter.chainId}: stores fetch ${storesResult.error || 'empty'}`);
        } else {
          const branchInputs: UpsertBranchInput[] = [];
          for (const s of storesResult.stores) {
            // קואורדינטות: 1) מהקובץ, 2) fallback של עיר, 3) geocoding חי
            let lat = s.lat;
            let lng = s.lng;
            let coordSource: 'portal' | 'geocoded' | 'unknown' = 'unknown';
            if (lat !== undefined && lng !== undefined) {
              coordSource = 'portal';
            } else {
              const cityFallback = cityFallbackCoords(s.city);
              if (cityFallback) {
                lat = cityFallback.lat;
                lng = cityFallback.lng;
                coordSource = 'geocoded'; // מקורב - רמת עיר
              }
            }
            branchInputs.push({
              chainId: adapter.chainId,
              chainName: adapter.chainName,
              storeId: s.storeId,
              storeName: s.storeName,
              address: s.address,
              city: s.city,
              zipCode: s.zipCode,
              lat, lng, coordSource,
            });
          }
          storesUpserted = await BranchDAL.bulkUpsert(branchInputs);
          storesFetched = storesResult.stores.length;
          logger.info(`[price-sync] ${adapter.chainId}: stores fetched=${storesFetched}, upserted=${storesUpserted}`);

          // בצע geocoding מדויק בלב הסנכרון רק לכמות מוגבלת כדי לא לתקוע אותו.
          // Nominatim מגביל ל-1 בקשה/שנייה - 20 סניפים = ~22 שניות. השאר יקבלו
          // geocoding בריצה הבאה של הסנכרון.
          const needGeo = branchInputs
            .filter(b => b.coordSource !== 'portal' && (b.address || b.city))
            .slice(0, 20);
          for (const b of needGeo) {
            const coords = await geocodeAddress(b.address, b.city);
            if (coords) {
              await BranchDAL.updateCoords(
                // chainId+storeId ייחודי, נחפש לפיו
                (await BranchDAL.findOne({ chainId: b.chainId, storeId: b.storeId }))?._id.toString() || '',
                coords.lat, coords.lng, 'geocoded'
              );
            }
          }
        }
      } catch (err) {
        logger.error(`[price-sync] ${adapter.chainId}: stores sync failed: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    const elapsedMs = Date.now() - t0;
    logger.info(`[price-sync] ${adapter.chainId}: fetched=${result.items.length}, upserted=${totalUpserted} in ${(elapsedMs / 1000).toFixed(1)}s`);

    const r: SyncResult = {
      chainId: adapter.chainId, chainName: adapter.chainName,
      fetched: result.items.length, upserted: totalUpserted, elapsedMs,
      storesFetched, storesUpserted,
    };
    results.push(r);
    lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
  }

  return results;
}
