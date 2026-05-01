import {
  osherAdAdapter,
  ramiLevyAdapter,
  yenotBitanAdapter,
  tivTaamAdapter,
  shufersalAdapter,
  keshetAdapter,
  stopMarketAdapter,
  politzerAdapter,
  doralonAdapter,
  victoryAdapter,
  maayan2000Adapter,
  shefaBirkatHashemAdapter,
  superSapirAdapter,
  normalizeProductName,
  type ChainAdapter,
} from '../chains';
import { PriceDAL, type UpsertPriceInput } from '../dal/price.dal';
import { BranchDAL, type UpsertBranchInput } from '../dal/branch.dal';
import { geocodeAddress, cityFallbackCoords } from './geocoder.service';
import { invalidateBranchCache } from './branches.service';
import { fetchAllChainsFromOsm } from './osmBranches.service';
import { logger } from '../../../config/logger';
import type { ChainId } from '../models/Price.model';

// כל ה-adapters הפעילים - רצים ברצף ב-syncAllChains.
// אם adapter נכשל, השאר ממשיכים.
// הוסרו: חצי חינם (מפרסמת בפורטל Cerberus אחר, לא publishedprices).
const adapters: ChainAdapter[] = [
  osherAdAdapter,
  ramiLevyAdapter,
  yenotBitanAdapter,
  tivTaamAdapter,
  keshetAdapter,
  stopMarketAdapter,
  politzerAdapter,
  doralonAdapter,
  shufersalAdapter,
  victoryAdapter,
  // מעיין 2000 - מנסה מספר מועמדי usernames בפורטל. אם כולם נכשלים,
  // הרשת תופיע ב-UI כ"אין נתונים היום" אבל לא תיעלם מהרשימה.
  maayan2000Adapter,
  // שפע ברכת השם וסופר ספיר - אותו דפוס: usernames לא ידועים בוודאות,
  // factory מנסה מועמדים. במקרה של כשל - מופיעים כ"אין נתונים היום".
  shefaBirkatHashemAdapter,
  superSapirAdapter,
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
  storesError?: string;
}

// דיליי בין רשת לרשת - הפורטל מגביל קצב בקשות, ואם שולחים 10 logins ברצף
// הוא סוגר את ההתחברויות המאוחרות יותר. 3 שניות זה מספיק להיראות "אנושי".
const DELAY_BETWEEN_CHAINS_MS = 3000;

/**
 * סנכרון סניפים מ-OpenStreetMap לכל הרשתות.
 * מקור נתונים אמין יותר מהפורטל הממשלתי שלא תמיד מפרסם Stores files.
 * פועל בנפרד מסנכרון המחירים - אפשר להריץ עצמאית.
 *
 * מחזיר סיכום: רשת -> כמות סניפים שנמשכו ועודכנו במונגו.
 */
export async function syncBranchesFromOsm(): Promise<Array<{ chainId: ChainId; chainName: string; fetched: number; upserted: number }>> {
  const chainIds = adapters.map(a => a.chainId);
  const chainNameMap = new Map(adapters.map(a => [a.chainId, a.chainName]));
  logger.info(`[osm-branches] starting sync for ${chainIds.length} chains`);

  const osmResults = await fetchAllChainsFromOsm(chainIds);
  const results: Array<{ chainId: ChainId; chainName: string; fetched: number; upserted: number }> = [];

  for (const [chainId, branches] of osmResults) {
    const chainName = chainNameMap.get(chainId) || chainId;
    if (branches.length === 0) {
      results.push({ chainId, chainName, fetched: 0, upserted: 0 });
      continue;
    }
    const inputs: UpsertBranchInput[] = branches.map(b => ({
      chainId, chainName,
      storeId: b.storeId,
      storeName: b.storeName,
      address: b.address,
      city: b.city,
      lat: b.lat,
      lng: b.lng,
      coordSource: 'portal' as const, // OSM נחשב מקור אמין כמו portal
    }));
    const upserted = await BranchDAL.bulkUpsert(inputs);
    logger.info(`[osm-branches] ${chainId}: ${branches.length} fetched, ${upserted} upserted`);
    results.push({ chainId, chainName, fetched: branches.length, upserted });
  }

  invalidateBranchCache();
  return results;
}

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

// מצב פרוגרס של סנכרון פעיל - מתעדכן במהלך syncAllChains ונקרא ע"י controller
// כדי להציג באדמין "רשת X מתוך N" + שם הרשת הנוכחית.
export interface SyncProgress {
  active: boolean;
  currentIndex: number;      // 0-based, מיקום הרשת הנוכחית ברצף
  currentChainName: string;  // שם הרשת בעיבוד
  totalChains: number;
  completedChains: number;
  startedAt: string | null;
}

let syncProgress: SyncProgress = {
  active: false, currentIndex: 0, currentChainName: '',
  totalChains: 0, completedChains: 0, startedAt: null,
};

export function getSyncProgress(): SyncProgress {
  return { ...syncProgress };
}

// סנכרון סניפים של רשת אחת. קואורדינטות: portal > fallback-של-עיר > Nominatim (חי, מוגבל).
async function syncStoresForChain(
  adapter: ChainAdapter
): Promise<{ fetched?: number; upserted?: number; error?: string }> {
  if (!adapter.fetchLatestStores) return { error: 'adapter_has_no_stores_support' };
  try {
    const res = await adapter.fetchLatestStores();
    if (res.error) {
      logger.warn(`[price-sync] ${adapter.chainId}: stores fetch ${res.error}`);
      return { error: res.error };
    }
    if (res.stores.length === 0) {
      logger.warn(`[price-sync] ${adapter.chainId}: stores fetch returned 0 items`);
      return { error: 'no_stores_in_file' };
    }

    const inputs: UpsertBranchInput[] = res.stores.map(s => {
      let { lat, lng } = s;
      let coordSource: 'portal' | 'geocoded' | 'unknown' = 'unknown';
      if (lat !== undefined && lng !== undefined) {
        coordSource = 'portal';
      } else {
        const fallback = cityFallbackCoords(s.city);
        if (fallback) { lat = fallback.lat; lng = fallback.lng; coordSource = 'geocoded'; }
      }
      return {
        chainId: adapter.chainId, chainName: adapter.chainName,
        storeId: s.storeId, storeName: s.storeName,
        address: s.address, city: s.city, zipCode: s.zipCode,
        lat, lng, coordSource,
        subChainId: s.subChainId, subChainName: s.subChainName, storeType: s.storeType,
      };
    });

    const upserted = await BranchDAL.bulkUpsert(inputs);
    logger.info(`[price-sync] ${adapter.chainId}: stores fetched=${res.stores.length}, upserted=${upserted}`);

    // Nominatim: 1 req/sec, מוגבל ל-20 סניפים לריצה - השאר יקבלו בסנכרון הבא
    const needGeo = inputs.filter(b => b.coordSource !== 'portal' && (b.address || b.city)).slice(0, 20);
    for (const b of needGeo) {
      const coords = await geocodeAddress(b.address, b.city);
      if (!coords) continue;
      const doc = await BranchDAL.findOne({ chainId: b.chainId, storeId: b.storeId });
      if (doc) await BranchDAL.updateCoords(doc._id.toString(), coords.lat, coords.lng, 'geocoded');
    }

    return { fetched: res.stores.length, upserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logger.error(`[price-sync] ${adapter.chainId}: stores sync failed: ${msg}`);
    return { error: msg };
  }
}

// רענון מחירים לכל הרשתות הפעילות — משמש גם בסקריפט הידני וגם בcron
export async function syncAllChains(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  syncProgress = {
    active: true, currentIndex: 0, currentChainName: '',
    totalChains: adapters.length, completedChains: 0,
    startedAt: new Date().toISOString(),
  };

  for (let i = 0; i < adapters.length; i++) {
    const adapter = adapters[i];
    syncProgress.currentIndex = i;
    syncProgress.currentChainName = adapter.chainName;

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
      syncProgress.completedChains = i + 1;
      continue;
    }

    if (result.items.length === 0) {
      logger.warn(`[price-sync] ${adapter.chainId}: no items to upsert`);
      const r: SyncResult = { chainId: adapter.chainId, chainName: adapter.chainName, fetched: 0, upserted: 0, elapsedMs: Date.now() - t0, error: 'no_items_found' };
      results.push(r);
      lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
      syncProgress.completedChains = i + 1;
      continue;
    }

    // ===== אגרגציה פר-סניף =====
    // ה-XML מהפורטל מכיל שורת מחיר לכל (סניף, מוצר). שני הצרכים שלנו:
    //  1. מחיר אחד "מייצג" לכל זוג (chainId, barcode) להשוואה מהירה.
    //  2. ידיעה כמה סניפים מוכרים את המוצר ובאיזה טווח מחירים.
    // הפתרון: מקבצים לפי (chainId, barcode), בוחרים את המחיר הזול כמייצג,
    // ושומרים גם min/max/count + cheapestStoreId לתצוגה ללקוח.
    type AggKey = string;
    const agg = new Map<AggKey, {
      first: typeof result.items[number];      // הפריט הראשון - לשמירת המטא-דאטה
      minPrice: number; maxPrice: number;
      cheapestStoreId?: string;
      count: number;
    }>();
    for (const item of result.items) {
      const key = `${item.barcode}`;
      const existing = agg.get(key);
      if (!existing) {
        agg.set(key, {
          first: item,
          minPrice: item.price, maxPrice: item.price,
          cheapestStoreId: item.storeId,
          count: 1,
        });
      } else {
        existing.count++;
        if (item.price < existing.minPrice) {
          existing.minPrice = item.price;
          existing.cheapestStoreId = item.storeId;
          // עדכון ה-"first" למחיר הזול - גם המטא-דאטה תייצג את הסניף הזול
          existing.first = item;
        }
        if (item.price > existing.maxPrice) existing.maxPrice = item.price;
      }
    }
    const inputs: UpsertPriceInput[] = Array.from(agg.values()).map(({ first: item, minPrice, maxPrice, cheapestStoreId, count }) => {
      const updateDate = item.itemPriceUpdateDate ? new Date(item.itemPriceUpdateDate) : undefined;
      return {
        barcode: item.barcode,
        itemName: item.itemName,
        itemNameNormalized: normalizeProductName(item.itemName),
        chainId: adapter.chainId,
        chainName: adapter.chainName,
        storeId: cheapestStoreId,            // הסניף שבו המחיר הזול
        price: minPrice,                      // המחיר הזול ברשת = "המייצג"
        unitOfMeasure: item.unitOfMeasure,
        manufacturerName: item.manufacturerName,
        quantity: item.quantity,
        // שדות עשירים נוספים מהפורטל - מאפשרים תצוגה מפורטת ב-UI
        manufactureCountry: item.manufactureCountry,
        manufacturerItemDescription: item.manufacturerItemDescription,
        qtyInPackage: item.qtyInPackage,
        isWeighted: item.isWeighted,
        unitQty: item.unitQty,
        itemPriceUpdateDate: updateDate && !isNaN(updateDate.getTime()) ? updateDate : undefined,
        // אגרגציית סניפים - הלקוח יראה "₪10-12 ב-X סניפים, הזול ב-...":
        storesWithPrice: count,
        priceMin: minPrice,
        priceMax: maxPrice,
        cheapestStoreId,
        // דגלי סטטוס/מטא נוספים - לתצוגה ולסינון מוצרים חסומים בעתיד
        itemType: item.itemType,
        itemId: item.itemId,
        allowDiscount: item.allowDiscount,
        blockedItem: item.blockedItem,
        itemStatus: item.itemStatus,
        bikoretNo: item.bikoretNo,
        unitOfMeasurePrice: item.unitOfMeasurePrice,
      };
    });

    const BATCH_SIZE = 500;
    let totalUpserted = 0;
    for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
      const batch = inputs.slice(i, i + BATCH_SIZE);
      const affected = await PriceDAL.bulkUpsert(batch);
      totalUpserted += affected;
    }

    // סנכרון סניפים - נפרד, לא חוסם את המחירים אם נכשל
    const storesSummary = adapter.fetchLatestStores
      ? await syncStoresForChain(adapter)
      : { error: 'adapter_has_no_stores_support' };
    const storesFetched = storesSummary.fetched;
    const storesUpserted = storesSummary.upserted;
    const storesError = storesSummary.error;

    const elapsedMs = Date.now() - t0;
    logger.info(`[price-sync] ${adapter.chainId}: fetched=${result.items.length}, upserted=${totalUpserted} in ${(elapsedMs / 1000).toFixed(1)}s`);

    const r: SyncResult = {
      chainId: adapter.chainId, chainName: adapter.chainName,
      fetched: result.items.length, upserted: totalUpserted, elapsedMs,
      storesFetched, storesUpserted, storesError,
    };
    results.push(r);
    lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
    syncProgress.completedChains = i + 1;
  }

  // חשוב: מנקים את ה-cache של branches כדי שהסניפים החדשים יופיעו מיד
  // במונע השוואת המחירים (אחרת ה-cache של 2 דק' יגיש רשימה ישנה/ריקה).
  invalidateBranchCache();

  syncProgress = {
    active: false, currentIndex: 0, currentChainName: '',
    totalChains: 0, completedChains: 0, startedAt: null,
  };

  return results;
}
