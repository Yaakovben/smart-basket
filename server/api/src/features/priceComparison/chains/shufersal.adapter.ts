/**
 * shufersal.adapter.ts
 *
 * שופרסל — פורטל שקיפות עצמאי (prices.shufersal.co.il).
 * הפורטל הזה שונה מ-publishedprices.co.il:
 *  - ללא login
 *  - דף HTML שרושם קבצי XML.gz
 *  - catID: 1=Price, 2=PriceFull, 3=Promo, 4=PromoFull, 5=Stores. 20 קבצים לדף (&page=N)
 *
 * קובצי המחירים במבנה Root/Items/Item. קובץ הסניפים מתחיל ב-<Chain> ומפוענח
 * ב-parseStoresXml הכללי, כולל תתי-הרשתות (יש חסד, דיל, אקספרס...).
 */

import { XMLParser } from 'fast-xml-parser';
import { gunzipSync } from 'zlib';
import { axiosGetWithTlsFallback } from './insecureAgent';
import { parseStoresXml } from './portalXmlParser';
import { retryDownload } from './downloadRetry';
import { PriceRows } from './priceRows';
import type {
  ChainAdapter, ChainFetchResult, ChainPriceItem,
  ChainStoresFetchResult, ChainFileRef,
} from './types';

const SHUFERSAL_PORTAL = 'https://prices.shufersal.co.il';
const FETCH_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
// הגנה מפני קובץ ענק (בדחיסה ואחריה) - ראו הסבר ב-portalFiles.ts / portalXmlParser.ts
const MAX_COMPRESSED_BYTES = 150 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 300 * 1024 * 1024;
// הפורטל של שופרסל ולעיתים גם pricesprodpublic.blob.core.windows.net
// מחזירים שרשרת תעודות שלפעמים חסרה ב-CA bundle של Node/Linux.
// axiosGetWithTlsFallback מנסה TLS תקין תחילה — fallback רק בשגיאת CERT.

interface PriceFullXml {
  // מזהה הסניף בשופרסל מופיע ברמת הקובץ (Root/StoreID) ולא בכל פריט
  Root?: { StoreID?: string | number; StoreId?: string | number; Items?: { Item?: RawItem[] | RawItem } };
  root?: { StoreID?: string | number; StoreId?: string | number; Items?: { Item?: RawItem[] | RawItem } };
}

interface RawItem {
  ItemCode?: string;
  ItemName?: string;
  ItemPrice?: string | number;
  UnitOfMeasure?: string;
  ManufacturerName?: string;
  Quantity?: string | number;
  StoreId?: string;
}

// מחלצים את קישור ההורדה הראשון מעמוד הקטלוג.
// שופרסל מפרסם כמה עשרות קישורים ב-URL pattern של pricesprodpublic.blob...
// ובכמה תבניות href: במפורש, או דרך /FileObject/UpdateCategory?... + FileNm=.
// HTML decode פשוט - הפורטל מחזיר &amp; ב-href ואקסיוס לא יודע לפענח
const decodeHtml = (s: string): string => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

function extractLatestFileUrl(html: string, fileNamePrefix: string): string | null {
  const all = extractAllFileUrls(html, fileNamePrefix);
  return all[0] || null;
}

// מחלץ את כל קישורי ההורדה לקובץ עם prefix נתון - לרשתות שמפרסמות
// קובץ נפרד לכל סניף (כמו שופרסל) צריך להוריד את כולם ולמזג.
function extractAllFileUrls(html: string, fileNamePrefix: string): string[] {
  const urls: string[] = [];
  const directMatches = [
    ...html.matchAll(new RegExp(`href="([^"]*${fileNamePrefix}[^"]*\\.(gz|xml)[^"]*)"`, 'gi')),
  ];
  for (const m of directMatches) {
    const url = decodeHtml(m[1]);
    if (url.startsWith('http')) urls.push(url);
    else if (url.startsWith('/')) urls.push(`${SHUFERSAL_PORTAL}${url}`);
    else urls.push(`${SHUFERSAL_PORTAL}/${url}`);
  }
  if (urls.length > 0) return urls;
  // fallback: UpdateCategory + FileNm
  const relativeMatches = [
    ...html.matchAll(new RegExp(`href="(/FileObject[^"]*FileNm=[^"]*${fileNamePrefix}[^"]*\\.(gz|xml)[^"]*)"`, 'gi')),
  ];
  return relativeMatches.map(m => `${SHUFERSAL_PORTAL}${decodeHtml(m[1])}`);
}

async function fetchCategoryHtml(catID: number): Promise<string> {
  const res = await axiosGetWithTlsFallback<string>(`${SHUFERSAL_PORTAL}/FileObject/UpdateCategory?catID=${catID}&storeId=0`, {
    timeout: FETCH_TIMEOUT_MS,
    headers: { 'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)' },
  });
  return res.data;
}

// catID=2 בפורטל = PriceFull, catID=4 = PromoFull. הרשימה מחולקת לדפים של 20 קבצים (&page=N)
const CAT_PRICE_FULL = 2;
const CAT_PROMO_FULL = 4;
const MAX_LISTING_PAGES = 60;

async function fetchCategoryPage(catID: number, page: number): Promise<string> {
  const res = await axiosGetWithTlsFallback<string>(`${SHUFERSAL_PORTAL}/FileObject/UpdateCategory?catID=${catID}&storeId=0&page=${page}`, {
    timeout: FETCH_TIMEOUT_MS,
    headers: { 'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)' },
  });
  return res.data;
}

interface StoreFileUrl { url: string; name: string; subChainId: string; storeId: string }

// הקובץ העדכני של כל סניף מסוג נתון, מכל דפי הרשימה
async function listLatestPerStore(catID: number, prefix: 'PriceFull' | 'PromoFull'): Promise<StoreFileUrl[]> {
  const pattern = new RegExp(`${prefix}(\\d+)-(\\d+)-(\\d+)-(\\d{8})-(\\d{6})\\.gz`, 'i');
  const latest = new Map<string, StoreFileUrl & { stamp: string }>();
  const seen = new Set<string>();
  for (let page = 1; page <= MAX_LISTING_PAGES; page++) {
    const html = await withRetry(() => fetchCategoryPage(catID, page));
    let added = 0;
    for (const url of extractAllFileUrls(html, prefix)) {
      const m = url.match(pattern);
      if (!m || seen.has(m[0])) continue;
      seen.add(m[0]);
      added++;
      const key = `${m[2]}-${m[3]}`;
      const stamp = `${m[4]}${m[5]}`;
      const existing = latest.get(key);
      if (!existing || stamp > existing.stamp) latest.set(key, { url, name: m[0], subChainId: m[2], storeId: m[3], stamp });
    }
    // דף בלי קבצים חדשים = הגענו לסוף הרשימה
    if (added === 0) break;
  }
  return [...latest.values()];
}

// קישורי ההורדה של שופרסל חתומים לזמן מוגבל. הורדת כל קובצי המבצעים (429) לקחה
// 49 דקות, ובאמצע פג התוקף: 146 קבצים נכשלו ב-403 (30.9.2026), ולסניפים שלהם לא
// הוצגו מבצעים. כשקישור פג, מביאים את הרשימה מחדש (פעם אחת לכל הקבצים שנכשלו יחד)
// ומורידים מהקישור הטרי של אותו סניף.
const storeKey = (f: Pick<StoreFileUrl, 'subChainId' | 'storeId'>) => `${f.subChainId}-${f.storeId}`;
const isExpiredLink = (err: unknown) =>
  (err as { response?: { status?: number } })?.response?.status === 403 || /status code 403/.test(String((err as Error)?.message));

function freshLinks(catID: number, prefix: 'PriceFull' | 'PromoFull', initial: StoreFileUrl[]) {
  let urls = new Map(initial.map(f => [storeKey(f), f.url]));
  let refreshing: Promise<void> | null = null;
  const refresh = () => {
    refreshing ??= listLatestPerStore(catID, prefix)
      .then(list => { urls = new Map(list.map(f => [storeKey(f), f.url])); })
      .finally(() => { refreshing = null; });
    return refreshing;
  };
  return async (key: string): Promise<{ buf: Buffer; isGzipped: boolean }> => {
    try {
      return await retryDownload(() => downloadBuffer(urls.get(key)!));
    } catch (err) {
      if (!isExpiredLink(err)) throw err;
      await refresh();
      return retryDownload(() => downloadBuffer(urls.get(key)!));
    }
  };
}

// עד max סניפים, לסירוגין בין תתי-הרשתות (שלי, דיל, אקספרס, יש חסד...), כדי שכל
// מותג יקבל מחירי סניף אמיתיים ולא רק מה שבמקרה בדף הראשון של הרשימה
export function spreadAcrossSubChains<T extends { subChainId: string; storeId: string }>(files: T[], max: number): T[] {
  const bySub = new Map<string, T[]>();
  for (const f of [...files].sort((a, b) => Number(a.storeId) - Number(b.storeId))) {
    const list = bySub.get(f.subChainId) ?? [];
    list.push(f);
    bySub.set(f.subChainId, list);
  }
  const queues = [...bySub.values()];
  const picked: T[] = [];
  for (let i = 0; picked.length < max && queues.some(q => i < q.length); i++) {
    for (const q of queues) {
      if (i < q.length && picked.length < max) picked.push(q[i]);
    }
  }
  return picked;
}

async function downloadBuffer(url: string): Promise<{ buf: Buffer; isGzipped: boolean }> {
  const res = await axiosGetWithTlsFallback<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: DOWNLOAD_TIMEOUT_MS,
    maxContentLength: MAX_COMPRESSED_BYTES,
    maxBodyLength: MAX_COMPRESSED_BYTES,
    headers: { 'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)' },
  });
  const buf = Buffer.from(res.data);
  const isGzipped = url.toLowerCase().includes('.gz');
  return { buf, isGzipped };
}

function parseXmlBuffer(buf: Buffer, isGzipped: boolean): ChainPriceItem[] {
  const xml = isGzipped ? gunzipSync(buf, { maxOutputLength: MAX_DECOMPRESSED_BYTES }).toString('utf-8') : buf.toString('utf-8');
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
  });
  const parsed = parser.parse(xml) as PriceFullXml;
  const itemsNode = parsed.Root?.Items?.Item || parsed.root?.Items?.Item;
  if (!itemsNode) return [];
  // בלי מזהה סניף לא אפשר לשמור מחיר ברמת סניף. הפריט עצמו לא נושא אותו, ולכן
  // לוקחים מרמת הקובץ.
  const root = parsed.Root ?? parsed.root;
  const fileStoreIdRaw = root?.StoreID ?? root?.StoreId;
  const fileStoreId = fileStoreIdRaw !== undefined && String(fileStoreIdRaw).trim() !== '' ? String(fileStoreIdRaw).trim() : undefined;
  const priceItems = Array.isArray(itemsNode) ? itemsNode : [itemsNode];

  const results: ChainPriceItem[] = [];
  for (const it of priceItems) {
    const barcode = String(it.ItemCode || '').trim();
    const price = parseFloat(String(it.ItemPrice || '0'));
    const itemName = String(it.ItemName || '').trim();
    if (!barcode || !itemName || isNaN(price) || price <= 0) continue;
    // הרחבה: שאיבת אותם שדות עשירים כמו factory - מביא את שופרסל לרמה אחידה.
    const itAny = it as Record<string, unknown>;
    const get = (...keys: string[]): string | undefined => {
      for (const k of keys) {
        const v = itAny[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
      return undefined;
    };
    const getNum = (...keys: string[]): number | undefined => {
      const v = get(...keys);
      if (v === undefined) return undefined;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const isWeightedRaw = get('bIsWeighted', 'BIsWeighted', 'IsWeighted', 'isWeighted');
    const allowDiscountRaw = get('AllowDiscount', 'allowDiscount');
    const blockedRaw = get('BlockedItem', 'blockedItem', 'StatusBlock');
    results.push({
      barcode,
      itemName,
      price,
      unitOfMeasure: get('UnitOfMeasure'),
      manufacturerName: get('ManufacturerName', 'ManufactureName'),
      quantity: getNum('Quantity'),
      storeId: get('StoreId') ?? fileStoreId,
      manufactureCountry: get('ManufactureCountry'),
      manufacturerItemDescription: get('ManufacturerItemDescription', 'ManufactureItemDescription'),
      qtyInPackage: getNum('QtyInPackage'),
      isWeighted: isWeightedRaw !== undefined ? (isWeightedRaw === '1' || isWeightedRaw.toLowerCase() === 'true') : undefined,
      unitQty: get('UnitQty'),
      itemPriceUpdateDate: get('PriceUpdateDate', 'PriceUpdateTime'),
      itemType: getNum('ItemType'),
      itemId: get('ItemId'),
      allowDiscount: allowDiscountRaw !== undefined ? (allowDiscountRaw === '1' || allowDiscountRaw.toLowerCase() === 'true') : undefined,
      blockedItem: blockedRaw !== undefined ? (blockedRaw === '1' || blockedRaw.toLowerCase() === 'true') : undefined,
      itemStatus: get('ItemStatus'),
      bikoretNo: get('BikoretNo'),
      unitOfMeasurePrice: getNum('UnitOfMeasurePrice'),
    });
  }
  return results;
}

// retry helper משותף - רק על תקלות רשת
function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message || '';
  const c = (err as { code?: string }).code || '';
  // ECONNABORTED = timeout של axios. הפורטל נוטה להאט תחת עומס, וניסיון חוזר עוזר
  return /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|getaddrinfo|socket hang up|timeout of \d+ms exceeded/i.test(m)
    || /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ECONNABORTED/.test(c);
}
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) throw err;
      await new Promise<void>(r => setTimeout(r, 1500 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

export const shufersalAdapter: ChainAdapter = {
  chainId: 'shufersal',
  chainName: 'שופרסל',

  async fetchLatestPrices(): Promise<ChainFetchResult> {
    try {
      // שופרסל מפרסמת קובץ נפרד לכל סניף (PriceFull7290...-SS-...gz), ולכן
      // מורידים מספר קבצים ומאחדים. catID=2 הוא PriceFull (מלא, אלפי פריטים לקובץ). קודם נקרא רק הדף הראשון של
      // הרשימה (20 קבצים), ולכן מחירי סניף הגיעו מ-20 סניפים שנבחרו במקרה.
      // עכשיו כל הדפים, הקובץ העדכני לכל סניף, ופריסה על פני תתי-הרשתות.
      const files = await listLatestPerStore(CAT_PRICE_FULL, 'PriceFull');
      if (files.length === 0) {
        return { chainId: 'shufersal', chainName: 'שופרסל', items: [], fetchedFiles: 0, error: 'no_price_file_found' };
      }

      // תקרת סניפים בגלל זיכרון השרת (512MB): כל סניף כ-6,000 שורות, ו-100 סניפים
      // הם כ-600 אלף שורות, פחות מרמי לוי (כמיליון שורות מ-98 סניפים).
      const MAX_STORES = 100;
      const BATCH = 3;
      const subset = spreadAcrossSubChains(files, MAX_STORES).map(storeKey);
      const download = freshLinks(CAT_PRICE_FULL, 'PriceFull', files);
      const allItems = new PriceRows();
      let fetched = 0;
      let lastError: string | undefined;

      for (let i = 0; i < subset.length; i += BATCH) {
        const batch = subset.slice(i, i + BATCH);
        const results = await Promise.allSettled(batch.map(async (key) => {
          const { buf, isGzipped } = await download(key);
          return parseXmlBuffer(buf, isGzipped);
        }));
        for (const r of results) {
          if (r.status === 'rejected') {
            lastError = r.reason instanceof Error ? r.reason.message : 'unknown';
            continue;
          }
          fetched++;
          // בלי dedup לפי ברקוד כאן: processChainItems (priceSync.service.ts)
          // מצפה לשורה אחת לכל (סניף, ברקוד) כדי לחשב מחיר-מינימום/סניף-זול
          // אמיתי בין הסניפים שנדגמו. dedup פר-ברקוד כאן היה משאיר רק את
          // הסניף הראשון שנטען לכל מוצר - "המחיר הזול ביותר" היה בפועל
          // "מחיר הסניף הראשון", בלי שגיאה גלויה לאף אחד.
          allItems.add(r.value);
        }
      }

      // לוג: מספר סניפים שהורידו, מספר ייחודיים. עוזר לדבג כשהמספר נמוך.
      const logFn = (await import('../../../config/logger')).logger;
      logFn.info(`[shufersal] fetched=${fetched}/${subset.length} stores, items=${allItems.length}${lastError ? `, lastErr=${lastError.substring(0, 60)}` : ''}`);

      if (allItems.length === 0) {
        return { chainId: 'shufersal', chainName: 'שופרסל', items: [], fetchedFiles: fetched, error: 'no_items_parsed' };
      }
      return { chainId: 'shufersal', chainName: 'שופרסל', items: allItems, fetchedFiles: fetched };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown_error';
      return { chainId: 'shufersal', chainName: 'שופרסל', items: [], fetchedFiles: 0, error: msg };
    }
  },

  async fetchLatestStores(): Promise<ChainStoresFetchResult> {
    try {
      return await withRetry(async () => {
        // catID=5 בשופרסל = StoresFull (קובץ הסניפים).
        // אם הקטגוריה משתנה - ננסה גם 0 (All).
        const catIdsToTry = [5, 0];
        // שופרסל עכשיו מפרסם בשם "Stores" (לא StoresFull). מחפשים את שניהם.
        const patterns = ['StoresFull', 'Stores'];
        let url: string | null = null;
        outer:
        for (const cat of catIdsToTry) {
          let html: string;
          try {
            html = await fetchCategoryHtml(cat);
          } catch { continue; }
          for (const p of patterns) {
            url = extractLatestFileUrl(html, p);
            if (url) break outer;
          }
        }
        if (!url) {
          return { chainId: 'shufersal', chainName: 'שופרסל', stores: [], fetchedFiles: 0, error: 'no_stores_file_found' };
        }
        const { buf } = await downloadBuffer(url);
        // הקובץ מתחיל ב-<Chain> ולא ב-<Root>, והסניפים בתוך SubChains > SubChain > Stores
        const stores = parseStoresXml(buf, url);
        return { chainId: 'shufersal', chainName: 'שופרסל', stores, fetchedFiles: 1 };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown_error';
      return { chainId: 'shufersal', chainName: 'שופרסל', stores: [], fetchedFiles: 0, error: msg };
    }
  },

  async listPromoFullFiles(): Promise<ChainFileRef[]> {
    const files = await listLatestPerStore(CAT_PROMO_FULL, 'PromoFull');
    const download = freshLinks(CAT_PROMO_FULL, 'PromoFull', files);
    return files.map(f => ({
      fileName: f.name,
      storeId: f.storeId,
      // הקישורים חתומים לזמן מוגבל: קישור שפג מתחדש מרשימה טרייה (freshLinks)
      download: async () => (await download(storeKey(f))).buf,
    }));
  },
};
