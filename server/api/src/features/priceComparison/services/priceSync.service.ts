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
  carrefourAdapter,
  normalizeProductName,
  type ChainAdapter,
} from '../chains';
import { PriceDAL, type UpsertPriceInput } from '../dal/price.dal';
import { BranchDAL, type UpsertBranchInput } from '../dal/branch.dal';
import { invalidateBranchCache } from './branches.service';
import { fetchAllChainsFromOsm } from './osmBranches.service';
import { logger } from '../../../config/logger';
import type { ChainId } from '../models/Price.model';

// כל ה-adapters הפעילים - רצים ברצף ב-syncAllChains.
// אם adapter נכשל, השאר ממשיכים.
const adapters: ChainAdapter[] = [
  // publishedprices.co.il (Cerberus + login)
  osherAdAdapter,
  ramiLevyAdapter,
  yenotBitanAdapter,
  tivTaamAdapter,
  keshetAdapter,
  stopMarketAdapter,
  politzerAdapter,
  doralonAdapter,
  victoryAdapter,
  // פורטלים עצמאיים פתוחים (אין login):
  shufersalAdapter,    // prices.shufersal.co.il
  carrefourAdapter,    // prices.carrefour.co.il (יינות ביתן/Carrefour)
  // binaprojects.com (פתוח, JSON list + 2-step download)
  maayan2000Adapter,
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

// (DELAY_BETWEEN_CHAINS_MS הוסר - הסנכרון רץ עכשיו במקבילי, כל רשת ב-portal
// שונה. אם נחזור לרצוף - להחזיר את הקבוע הזה.)

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
      // רק קואורדינטות אמיתיות מהפורטל - לא ממציאים "מרכז עיר".
      // אם הפורטל לא נתן lat/lng - הסניף נשמר עם הכתובת בלבד וייעדכן
      // אחרי geocoding ידני (כפתור באדמין) או אם הפורטל יספק בעתיד.
      const hasRealCoords = typeof s.lat === 'number' && typeof s.lng === 'number';
      return {
        chainId: adapter.chainId, chainName: adapter.chainName,
        storeId: s.storeId, storeName: s.storeName,
        address: s.address, city: s.city, zipCode: s.zipCode,
        lat: hasRealCoords ? s.lat : undefined,
        lng: hasRealCoords ? s.lng : undefined,
        coordSource: hasRealCoords ? ('portal' as const) : ('unknown' as const),
        subChainId: s.subChainId, subChainName: s.subChainName, storeType: s.storeType,
      };
    });

    const upserted = await BranchDAL.bulkUpsert(inputs);
    logger.info(`[price-sync] ${adapter.chainId}: stores fetched=${res.stores.length}, upserted=${upserted}`);
    // הגיאוקודינג עבר ל-postSyncGeocode שרץ פעם אחת אחרי כל הרשתות, סדרתי
    // עם 1.1ש' בין בקשות (Nominatim מגביל ל-1 req/sec).
    return { fetched: res.stores.length, upserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logger.error(`[price-sync] ${adapter.chainId}: stores sync failed: ${msg}`);
    return { error: msg };
  }
}

// סנכרון של רשת בודדת - מבודד כפונקציה לאפשר ריצה מקבילית של מספר רשתות.
// מחזיר את ה-SyncResult המלא ואת התוצאה הגולמית של ה-stores (לבר-תהליכים).
async function syncSingleChain(adapter: ChainAdapter): Promise<SyncResult> {
  const t0 = Date.now();
  logger.info(`[price-sync] ${adapter.chainId}: fetching latest prices...`);

  const result = await adapter.fetchLatestPrices();
  if (result.error) {
    logger.error(`[price-sync] ${adapter.chainId}: fetch error: ${result.error}`);
    const r: SyncResult = { chainId: adapter.chainId, chainName: adapter.chainName, fetched: 0, upserted: 0, elapsedMs: Date.now() - t0, error: result.error };
    lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
    return r;
  }

  if (result.items.length === 0) {
    logger.warn(`[price-sync] ${adapter.chainId}: no items to upsert`);
    const r: SyncResult = { chainId: adapter.chainId, chainName: adapter.chainName, fetched: 0, upserted: 0, elapsedMs: Date.now() - t0, error: 'no_items_found' };
    lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
    return r;
  }

  // המשך הקוד מתבצע במקום המקורי - אגרגציה ושמירה ב-DB.
  // משתמש ב-result דרך closure - שאר הלוגיקה הועברה למטה.
  return processChainItems(adapter, result, t0);
}

// רענון מחירים לכל הרשתות - סדרתי. הסנכרון רץ בקרון ופעמיים ביום ויש זמן.
// המקבילי גרם לעומס יתר על Render Free → לקוחות לא הצליחו להתחבר במהלך הסנכרון.
const DELAY_BETWEEN_CHAINS_MS = 3000;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

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
    if (i > 0) await sleep(DELAY_BETWEEN_CHAINS_MS);
    try {
      const r = await syncSingleChain(adapter);
      results.push(r);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error(`[price-sync] ${adapter.chainId}: unexpected error: ${msg}`);
      const r: SyncResult = { chainId: adapter.chainId, chainName: adapter.chainName, fetched: 0, upserted: 0, elapsedMs: 0, error: msg };
      results.push(r);
      lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
    }
    syncProgress.completedChains++;
  }

  invalidateBranchCache();

  syncProgress = {
    active: false, currentIndex: 0, currentChainName: '',
    totalChains: 0, completedChains: 0, startedAt: null,
  };

  return results;
}

// אגרגציה ושמירה של פריטים שהוחזרו מ-adapter בודד.
async function processChainItems(
  adapter: ChainAdapter,
  result: { items: import('../chains/types').ChainPriceItem[] },
  t0: number,
): Promise<SyncResult> {
  // ===== אגרגציה פר-סניף =====
  // ה-XML מהפורטל מכיל שורת מחיר לכל (סניף, מוצר). מקבצים לפי (chainId, barcode),
  // בוחרים את המחיר הזול כמייצג, ושומרים גם min/max/count + cheapestStoreId.
  const agg = new Map<string, {
    first: typeof result.items[number];
    minPrice: number; maxPrice: number;
    cheapestStoreId?: string;
    count: number;
  }>();
  for (const item of result.items) {
    // מסנן מוצרים חסומים/לא תקינים: blockedItem=true מצביע על מוצר שאין במלאי,
    // וכן מחירים אבסורדיים (0 או חריג גבוה) - לא רוצים להציג אותם ללקוח.
    if (item.blockedItem === true) continue;
    if (item.price <= 0 || item.price > 10_000) continue;
    const key = item.barcode;
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
      storeId: cheapestStoreId,
      price: minPrice,
      unitOfMeasure: item.unitOfMeasure,
      manufacturerName: item.manufacturerName,
      quantity: item.quantity,
      manufactureCountry: item.manufactureCountry,
      manufacturerItemDescription: item.manufacturerItemDescription,
      qtyInPackage: item.qtyInPackage,
      isWeighted: item.isWeighted,
      unitQty: item.unitQty,
      itemPriceUpdateDate: updateDate && !isNaN(updateDate.getTime()) ? updateDate : undefined,
      storesWithPrice: count,
      priceMin: minPrice,
      priceMax: maxPrice,
      cheapestStoreId,
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

  // סנכרון סניפים - לא חוסם את המחירים אם נכשל
  const storesSummary = adapter.fetchLatestStores
    ? await syncStoresForChain(adapter)
    : { error: 'adapter_has_no_stores_support' };

  const elapsedMs = Date.now() - t0;
  logger.info(`[price-sync] ${adapter.chainId}: fetched=${result.items.length}, upserted=${totalUpserted} in ${(elapsedMs / 1000).toFixed(1)}s`);

  const r: SyncResult = {
    chainId: adapter.chainId, chainName: adapter.chainName,
    fetched: result.items.length, upserted: totalUpserted, elapsedMs,
    storesFetched: storesSummary.fetched, storesUpserted: storesSummary.upserted, storesError: storesSummary.error,
  };
  lastSyncResults.set(adapter.chainId, { ...r, completedAt: new Date().toISOString() });
  return r;
}
