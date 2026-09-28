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
  haziHinamAdapter,
  machsaneiHashukAdapter,
  normalizeProductName,
  type ChainAdapter,
} from '../chains';
import { PriceDAL, type UpsertPriceInput } from '../dal/price.dal';
import { BranchPriceDAL } from '../dal/branchPrice.dal';
import { BranchDAL, type UpsertBranchInput } from '../dal/branch.dal';
import { invalidateBranchCache } from './branches.service';
import { normStoreId } from './storeId';
import { buildBarcodeStats, isPriceException, encodeStorePrice, exceedsExceptionBudget, MAX_EXCEPTION_ROWS_PER_CHAIN } from './branchPricing';
import { fetchAllChainsFromOsm } from './osmBranches.service';
import { syncPromotionsForChain } from './promoSync.service';
import { storageAllowsWrite, invalidateUsageCache, MAX_CLUSTER_USAGE_MB } from './storageGuard';
import { CBS_LOCALITY_NAMES } from '../data/cbsLocalities.data';
import { collectPriceFeedStats, countDuplicateRows, validatePriceFeed, validateStoresFeed, type PriceFeedStats } from './syncValidation';
import { PriceSyncLogDAL, type SyncLogFields } from '../dal/priceSyncLog.dal';
import { Price } from '../models/Price.model';
import { Branch } from '../models/Branch.model';
import { randomUUID } from 'crypto';
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
  // laibcatalog.co.il (API פתוח)
  victoryAdapter,
  machsaneiHashukAdapter,
  // פורטלים עצמאיים פתוחים (אין login):
  shufersalAdapter,    // prices.shufersal.co.il
  carrefourAdapter,    // prices.carrefour.co.il (יינות ביתן/Carrefour)
  haziHinamAdapter,    // shop.hazi-hinam.co.il/Prices
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
  // מבצעים (PromoFull)
  promotions?: number;
  promoError?: string;
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
      coordSource: 'portal' as const,
      openingHours: b.openingHours,
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

// העיר מקובץ הסניפים. רשתות רבות מפרסמות סמל יישוב של הלמ"ס (3000, 8300) ולא שם:
// מתורגם לפי הרשימה הרשמית. קוד שלא ברשימה (או "0") לא נשמר, כדי לא לדרוס שם אמיתי.
export function cityFromStoresFile(city: string | undefined): string | undefined {
  const t = city?.trim();
  if (!t) return undefined;
  if (!/^\d+$/.test(t)) return t;
  return CBS_LOCALITY_NAMES[String(Number(t))];
}

// סנכרון סניפים של רשת אחת. קואורדינטות: portal > fallback-של-עיר > Nominatim (חי, מוגבל).
async function syncStoresForChain(
  adapter: ChainAdapter,
  runId: string,
): Promise<{ fetched?: number; upserted?: number; error?: string }> {
  const startedAt = new Date();
  const fail = async (error: string, recordsDownloaded?: number) => {
    await PriceSyncLogDAL.record({ chainId: adapter.chainId, type: 'stores', runId, startedAt, status: 'failed', error, recordsDownloaded });
    return { error };
  };
  if (!adapter.fetchLatestStores) return fail('adapter_has_no_stores_support');
  try {
    const res = await adapter.fetchLatestStores();
    if (res.error) {
      logger.warn(`[price-sync] ${adapter.chainId}: stores fetch ${res.error}`);
      return fail(res.error);
    }
    const previous = await Branch.countDocuments({ chainId: adapter.chainId });
    const validation = validateStoresFeed(res.stores.length, previous);
    if (!validation.ok) {
      logger.warn(`[price-sync] ${adapter.chainId}: stores validation failed (${validation.reason}), keeping existing branches`);
      return fail(`validation:${validation.reason}`, res.stores.length);
    }

    const inputs: UpsertBranchInput[] = res.stores.map(s => {
      // רק קואורדינטות אמיתיות מהפורטל - לא ממציאים "מרכז עיר".
      // אם הפורטל לא נתן lat/lng - הסניף נשמר עם הכתובת בלבד וייעדכן
      // אחרי geocoding ידני (כפתור באדמין) או אם הפורטל יספק בעתיד.
      const hasRealCoords = typeof s.lat === 'number' && typeof s.lng === 'number';
      return {
        chainId: adapter.chainId, chainName: adapter.chainName,
        storeId: s.storeId, storeName: s.storeName,
        address: s.address, city: cityFromStoresFile(s.city), zipCode: s.zipCode,
        lat: hasRealCoords ? s.lat : undefined,
        lng: hasRealCoords ? s.lng : undefined,
        coordSource: hasRealCoords ? ('portal' as const) : ('unknown' as const),
        subChainId: s.subChainId, subChainName: s.subChainName, storeType: s.storeType,
      };
    });

    const upserted = await BranchDAL.bulkUpsert(inputs);
    logger.info(`[price-sync] ${adapter.chainId}: stores fetched=${res.stores.length}, upserted=${upserted}`);
    await PriceSyncLogDAL.record({
      chainId: adapter.chainId, type: 'stores', runId, startedAt, status: 'success',
      filesDownloaded: res.fetchedFiles, recordsDownloaded: res.stores.length, recordsUpdated: upserted,
      details: { previousBranches: previous },
    });
    // הגיאוקודינג עבר ל-postSyncGeocode שרץ פעם אחת אחרי כל הרשתות, סדרתי
    // עם 1.1ש' בין בקשות (Nominatim מגביל ל-1 req/sec).
    return { fetched: res.stores.length, upserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logger.error(`[price-sync] ${adapter.chainId}: stores sync failed: ${msg}`);
    return fail(msg);
  }
}

// סנכרון של רשת בודדת - מבודד כפונקציה לאפשר ריצה מקבילית של מספר רשתות.
// מחזיר את ה-SyncResult המלא ואת התוצאה הגולמית של ה-stores (לבר-תהליכים).
// שלבי רשת: מחירים (וסניפים), ואז מבצעים. המבצעים רצים גם כשהמחירים נכשלו:
// הם תלויים רק בקובצי PromoFull, והמבצעים הקיימים מוגנים בבדיקת התקינות שלהם.
async function syncSingleChain(adapter: ChainAdapter, runId: string): Promise<SyncResult> {
  const r = await syncChainPrices(adapter, runId);
  const promo = await syncPromotionsForChain(adapter, runId);
  // הרשת כתבה נתונים: הרשת הבאה מודדת את נפח האשכול מחדש
  invalidateUsageCache();
  const withPromo: SyncResult = {
    ...r,
    promotions: promo.promotions,
    promoError: promo.status === 'failed' ? promo.error : undefined,
  };
  lastSyncResults.set(adapter.chainId, { ...withPromo, completedAt: new Date().toISOString() });
  return withPromo;
}

interface PriceSyncContext {
  runId: string;
  startedAt: Date;
  stats: PriceFeedStats;
  previousBarcodes: number;
  fetchedFiles: number;
}

async function syncChainPrices(adapter: ChainAdapter, runId: string): Promise<SyncResult> {
  const t0 = Date.now();
  const startedAt = new Date();
  logger.info(`[price-sync] ${adapter.chainId}: fetching latest prices...`);

  const failed = async (error: string, extra: SyncLogFields = {}): Promise<SyncResult> => {
    await PriceSyncLogDAL.record({ chainId: adapter.chainId, type: 'price-full', runId, startedAt, status: 'failed', error, ...extra });
    return { chainId: adapter.chainId, chainName: adapter.chainName, fetched: 0, upserted: 0, elapsedMs: Date.now() - t0, error };
  };

  // שומר מכסה לפני ההורדה: אם האשכול קרוב למכסה, לא מורידים ולא כותבים
  const storage = await storageAllowsWrite();
  if (!storage.ok) {
    logger.warn(`[price-sync] ${adapter.chainId}: cluster at ${storage.usageMb?.toFixed(0)}MB (limit ${MAX_CLUSTER_USAGE_MB}MB), skipping to protect the shared quota`);
    return failed(`storage_quota_guard:${storage.usageMb?.toFixed(0)}MB`);
  }

  const result = await adapter.fetchLatestPrices();
  if (result.error) {
    logger.error(`[price-sync] ${adapter.chainId}: fetch error: ${result.error}`);
    return failed(result.error, { filesDownloaded: result.fetchedFiles });
  }

  // בדיקת תקינות לפני כל כתיבה: פיד ריק, חלקי או שבור לא נוגע במחירים הקיימים
  const stats = collectPriceFeedStats(result.items);
  const previousBarcodes = await Price.countDocuments({ chainId: adapter.chainId });
  // כמה סניפים הופיעו בפיד עכשיו, מול כמה סונכרנו בפעם הקודמת
  const feedStores = new Set<string>();
  for (const it of result.items) if (it.storeId) feedStores.add(normStoreId(it.storeId));
  const previousStores = (await BranchPriceDAL.storeIdsWithPrices(adapter.chainId)).size;
  const validation = validatePriceFeed(stats, previousBarcodes, feedStores.size, previousStores);
  if (!validation.ok) {
    logger.warn(`[price-sync] ${adapter.chainId}: validation failed (${validation.reason}), keeping existing prices`);
    return failed(`validation:${validation.reason}`, {
      filesDownloaded: result.fetchedFiles,
      recordsDownloaded: stats.total,
      recordsUnmatched: stats.missingBarcode,
      details: { ...stats, previousBarcodes, feedStores: feedStores.size, previousStores },
    });
  }

  return processChainItems(adapter, result, t0, { runId, startedAt, stats, previousBarcodes, fetchedFiles: result.fetchedFiles });
}

// רענון מחירים לכל הרשתות - סדרתי. הסנכרון רץ בקרון ופעמיים ביום ויש זמן.
// המקבילי גרם לעומס יתר על Render Free → לקוחות לא הצליחו להתחבר במהלך הסנכרון.
const DELAY_BETWEEN_CHAINS_MS = 3000;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// chainIds אופציונלי: סנכרון רשתות מסוימות בלבד (הרצה ידנית ממוקדת, למשל אחרי תיקון adapter)
export async function syncAllChains(chainIds?: string[]): Promise<SyncResult[]> {
  // מנעול יחיד ומשותף - קודם זה נבדק בנפרד ע"י sync.controller.ts (טריגר
  // אדמין) ו-priceSync.job.ts (cron), כל אחד עם boolean משלו שלא ידע על
  // השני. סנכרון-אדמין יכול היה להתחיל בדיוק כשה-cron של 04:00 כבר רץ -
  // שתי לולאות שמכפילות עומס על אותם פורטלים ודורסות זו את syncProgress
  // המשותף של זו. syncAllChains עצמו הוא הנקודה היחידה שדרכה עוברות שתי
  // הדרכים, אז זו הנקודה הנכונה לנעילה אחת ובלתי-מותנית.
  if (syncProgress.active) {
    logger.warn('[price-sync] syncAllChains called while a sync is already active - skipping');
    return [];
  }

  const results: SyncResult[] = [];
  const selected = chainIds ? adapters.filter(a => chainIds.includes(a.chainId)) : adapters;
  // מזהה ריצה משותף לכל הרשתות והשלבים: מקשר בין רשומות הלוג ומסמן את גרסאות המבצעים
  const runId = randomUUID();

  syncProgress = {
    active: true, currentIndex: 0, currentChainName: '',
    totalChains: selected.length, completedChains: 0,
    startedAt: new Date().toISOString(),
  };

  for (let i = 0; i < selected.length; i++) {
    const adapter = selected[i];
    syncProgress.currentIndex = i;
    syncProgress.currentChainName = adapter.chainName;
    if (i > 0) await sleep(DELAY_BETWEEN_CHAINS_MS);
    try {
      const r = await syncSingleChain(adapter, runId);
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
  ctx: PriceSyncContext,
): Promise<SyncResult> {
  const syncStart = new Date();
  // פריטים תקינים: אותם כללי סינון לכל האגרגציות. מוצר חסום (אין במלאי) ומחירים
  // אבסורדיים (0 או חריג גבוה) לא מוצגים ללקוח.
  const validItems = result.items.filter(it => it.blockedItem !== true && it.price > 0 && it.price <= 10_000);
  // מזהי סניף מנורמלים (בלי אפסים מובילים) - כך הם מתאימים לקובץ הסניפים
  const feedStoreIds = new Set<string>();
  for (const it of validItems) if (it.storeId) feedStoreIds.add(normStoreId(it.storeId));
  // גנרטור ולא filter+map: מערך ביניים של כל שורות הפיד (מיליונים ברשת גדולה)
  // היה מכפיל את צריכת הזיכרון בסנכרון
  function* feedRows() {
    for (const it of validItems) {
      if (it.storeId) yield { storeId: normStoreId(it.storeId), barcode: it.barcode, price: it.price };
    }
  }
  const barcodeStats = buildBarcodeStats(feedRows(), feedStoreIds.size);

  // חריגות מחיר ברמת סניף: לכל ברקוד, "סניף:מחיר" לכל סניף שמחירו שונה מהנפוץ.
  // נשמרות בתוך מסמך ה-Price עצמו (storePrices) ולא באוסף נפרד: שורה נפרדת לכל
  // (סניף x מוצר) עלתה מיליוני מסמכים ואינדקסים ומילאה את מכסת 512MB של Atlas.
  // ראו services/branchPricing.ts.
  const exceptionsByBarcode = new Map<string, string[]>();
  let exceptionCount = 0;
  for (const it of validItems) {
    if (!it.storeId) continue;
    if (!isPriceException(it.price, barcodeStats.get(it.barcode))) continue;
    const list = exceptionsByBarcode.get(it.barcode) ?? [];
    list.push(encodeStorePrice(normStoreId(it.storeId), it.price));
    exceptionsByBarcode.set(it.barcode, list);
    exceptionCount++;
  }
  // רשת שמחיריה משתנים מאוד בין סניפים: לא שומרים ברמת סניף כלל. חלקי-נתונים היה
  // גרוע יותר, כי היעדר חריגה מוסק כמחיר הנפוץ.
  const overBudget = exceedsExceptionBudget(exceptionCount);
  if (overBudget) {
    logger.warn(`[price-sync] ${adapter.chainId}: ${exceptionCount} price exceptions exceed budget of ${MAX_EXCEPTION_ROWS_PER_CHAIN}, storing chain-level prices only`);
    exceptionsByBarcode.clear();
    feedStoreIds.clear();
  }

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
      modalPrice: barcodeStats.get(item.barcode)?.modalPrice,
      storeCoverage: barcodeStats.get(item.barcode)?.coverage,
      // מערך ריק (ולא חסר) מנקה חריגות של סנכרון קודם
      storePrices: exceptionsByBarcode.get(item.barcode) ?? [],
    };
  });

  // Batches של 200 docs (קטן יותר → bulkWrite קצר יותר → פחות נעילה ב-DB).
  // setImmediate בין batches משחרר את ה-event loop ל-I/O events של לקוחות
  // בלי להוסיף השהיה מלאכותית - בקשות אחרות עוברות מיד כשיש זמינות.
  const BATCH_SIZE = 200;
  let totalUpserted = 0;
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const affected = await PriceDAL.bulkUpsert(batch);
    totalUpserted += affected;
    if (i + BATCH_SIZE < inputs.length) {
      await new Promise<void>(r => setImmediate(r));
    }
  }

  // סנכרון סניפים - לא חוסם את המחירים אם נכשל
  const storesSummary = await syncStoresForChain(adapter, ctx.runId);

  // רושמים אילו סניפים סונכרנו: רק עליהם אפשר להסיק מחיר גם בלי חריגה שמורה.
  // לרשת בלי מזהי סניף או שחרגה מהתקציב אין כיסוי, וההשוואה נשארת ברמת רשת.
  if (feedStoreIds.size > 0) {
    await BranchPriceDAL.recordCoverage(adapter.chainId, Array.from(feedStoreIds), syncStart);
  } else {
    await BranchPriceDAL.clearCoverage(adapter.chainId);
  }
  logger.info(`[price-sync] ${adapter.chainId}: branch price exceptions=${exceptionCount}${overBudget ? ' (over budget, not stored)' : ''} of ${validItems.length} items, stores=${feedStoreIds.size}`);

  const elapsedMs = Date.now() - t0;
  logger.info(`[price-sync] ${adapter.chainId}: fetched=${result.items.length}, upserted=${totalUpserted} in ${(elapsedMs / 1000).toFixed(1)}s`);

  let rowsWithStore = 0;
  for (const it of validItems) if (it.storeId) rowsWithStore++;
  await PriceSyncLogDAL.record({
    chainId: adapter.chainId, type: 'price-full', runId: ctx.runId, startedAt: ctx.startedAt, status: 'success',
    filesDownloaded: ctx.fetchedFiles,
    recordsDownloaded: result.items.length,
    recordsInserted: Math.max(0, inputs.length - ctx.previousBarcodes),
    recordsUpdated: totalUpserted,
    recordsUnmatched: ctx.stats.missingBarcode,
    details: {
      distinctBarcodes: ctx.stats.distinctBarcodes,
      previousBarcodes: ctx.previousBarcodes,
      invalidPrice: ctx.stats.invalidPrice,
      missingStore: ctx.stats.missingStore,
      invalidUpdateDate: ctx.stats.invalidUpdateDate,
      duplicates: countDuplicateRows(rowsWithStore, Array.from(barcodeStats.values(), s => s.storeCount)),
      branchesWithPrices: feedStoreIds.size,
      priceExceptions: exceptionCount,
      overBudget,
    },
  });

  return {
    chainId: adapter.chainId, chainName: adapter.chainName,
    fetched: result.items.length, upserted: totalUpserted, elapsedMs,
    storesFetched: storesSummary.fetched, storesUpserted: storesSummary.upserted, storesError: storesSummary.error,
  };
}
