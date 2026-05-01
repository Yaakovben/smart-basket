/**
 * shufersal.adapter.ts
 *
 * שופרסל — פורטל שקיפות עצמאי (prices.shufersal.co.il).
 * הפורטל הזה שונה מ-publishedprices.co.il:
 *  - ללא login
 *  - דף HTML שרושם קבצי XML.gz
 *  - catID=0/1/2 - מחירים; catID=5 - סניפים (StoresFull)
 *
 * מבנה ה-XML זהה (Root/Items/Item) — אפשר להשתמש באותו parser.
 */

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { gunzipSync } from 'zlib';
import { Agent as HttpsAgent } from 'https';
import type {
  ChainAdapter, ChainFetchResult, ChainPriceItem,
  ChainStoreItem, ChainStoresFetchResult,
} from './types';

const SHUFERSAL_PORTAL = 'https://prices.shufersal.co.il';
const FETCH_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
// סוכן HTTPS שמדלג על אימות תעודה - הפורטל של שופרסל ולעיתים גם
// pricesprodpublic.blob.core.windows.net מחזירים שרשרת תעודות שלא
// תמיד תקפה. דורש httpsAgent מותאם כדי לא ליפול ב-UNABLE_TO_VERIFY.
const insecureHttpsAgent = new HttpsAgent({ rejectUnauthorized: false });

interface PriceFullXml {
  Root?: { Items?: { Item?: RawItem[] | RawItem } };
  root?: { Items?: { Item?: RawItem[] | RawItem } };
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
  const res = await axios.get<string>(`${SHUFERSAL_PORTAL}/FileObject/UpdateCategory?catID=${catID}&storeId=0`, {
    timeout: FETCH_TIMEOUT_MS,
    httpsAgent: insecureHttpsAgent,
    headers: { 'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)' },
  });
  return res.data;
}

async function downloadBuffer(url: string): Promise<{ buf: Buffer; isGzipped: boolean }> {
  const res = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: DOWNLOAD_TIMEOUT_MS,
    httpsAgent: insecureHttpsAgent,
    headers: { 'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)' },
  });
  const buf = Buffer.from(res.data);
  const isGzipped = url.toLowerCase().includes('.gz');
  return { buf, isGzipped };
}

function parseXmlBuffer(buf: Buffer, isGzipped: boolean): ChainPriceItem[] {
  const xml = isGzipped ? gunzipSync(buf).toString('utf-8') : buf.toString('utf-8');
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
  });
  const parsed = parser.parse(xml) as PriceFullXml;
  const itemsNode = parsed.Root?.Items?.Item || parsed.root?.Items?.Item;
  if (!itemsNode) return [];
  const arr = Array.isArray(itemsNode) ? itemsNode : [itemsNode];

  const results: ChainPriceItem[] = [];
  for (const it of arr) {
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
      manufacturerName: get('ManufacturerName'),
      quantity: getNum('Quantity'),
      storeId: get('StoreId'),
      manufactureCountry: get('ManufactureCountry'),
      manufacturerItemDescription: get('ManufacturerItemDescription'),
      qtyInPackage: getNum('QtyInPackage'),
      isWeighted: isWeightedRaw !== undefined ? (isWeightedRaw === '1' || isWeightedRaw.toLowerCase() === 'true') : undefined,
      unitQty: get('UnitQty'),
      itemPriceUpdateDate: get('PriceUpdateDate'),
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

// פרסור של קובץ Stores (Asx/STORE) של שופרסל
function parseStoresXmlShufersal(buf: Buffer, isGzipped: boolean): ChainStoreItem[] {
  const xml = isGzipped ? gunzipSync(buf).toString('utf-8') : buf.toString('utf-8');
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });
  const parsed = parser.parse(xml) as Record<string, unknown>;

  const pickAny = (obj: unknown, keys: string[]): unknown => {
    if (!obj || typeof obj !== 'object') return undefined;
    const rec = obj as Record<string, unknown>;
    for (const k of keys) {
      const found = Object.keys(rec).find(x => x.toLowerCase() === k.toLowerCase());
      if (found && rec[found] !== undefined) return rec[found];
    }
    return undefined;
  };

  const root = pickAny(parsed, ['asx:abap', 'Root', 'root']);
  // שופרסל: asx:values -> STORE (array)
  const values = pickAny(root, ['asx:values', 'values', 'SubChains', 'Stores']);
  let storeNodes: unknown[] = [];
  const collected = pickAny(values, ['STORE', 'Store', 'SubChain']);
  if (Array.isArray(collected)) storeNodes = collected;
  else if (collected) storeNodes = [collected];

  // fallback: סריקה רקורסיבית אם לא הגענו לרמת הסניף
  if (storeNodes.length === 0) {
    const recurse = (n: unknown): unknown[] => {
      if (!n || typeof n !== 'object') return [];
      if (Array.isArray(n)) return n.flatMap(recurse);
      const rec = n as Record<string, unknown>;
      if ('STOREID' in rec || 'StoreId' in rec) return [rec];
      return Object.values(rec).flatMap(recurse);
    };
    storeNodes = recurse(parsed);
  }

  const pick = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const k of keys) {
      const found = Object.keys(obj).find(x => x.toLowerCase() === k.toLowerCase());
      if (found && obj[found] !== undefined && obj[found] !== null && obj[found] !== '') {
        return String(obj[found]).trim();
      }
    }
    return undefined;
  };
  const toNum = (v: string | undefined): number | undefined => {
    if (!v) return undefined;
    const n = parseFloat(v);
    if (!Number.isFinite(n) || n === 0) return undefined;
    return n;
  };

  const results: ChainStoreItem[] = [];
  for (const node of storeNodes) {
    if (!node || typeof node !== 'object') continue;
    const rec = node as Record<string, unknown>;
    const storeId = pick(rec, ['StoreId', 'STOREID']);
    const storeName = pick(rec, ['StoreName', 'STORENAME']);
    if (!storeId || !storeName) continue;
    const lat = toNum(pick(rec, ['Latitude', 'LATITUDE']));
    const lng = toNum(pick(rec, ['Longitude', 'LONGITUDE']));
    const valid = lat !== undefined && lng !== undefined && lat >= 29 && lat <= 34 && lng >= 33 && lng <= 36;
    results.push({
      storeId,
      storeName,
      address: pick(rec, ['Address', 'ADDRESS']),
      city: pick(rec, ['City', 'CITY']),
      zipCode: pick(rec, ['ZipCode', 'ZIPCODE']),
      lat: valid ? lat : undefined,
      lng: valid ? lng : undefined,
    });
  }
  return results;
}

// retry helper משותף - רק על תקלות רשת
function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message || '';
  const c = (err as { code?: string }).code || '';
  return /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|getaddrinfo|socket hang up/i.test(m)
    || /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED/.test(c);
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
      // שופרסל מפרסמת קובץ נפרד לכל סניף (PriceFull7290...-SS-...gz)
      // לכן מורידים מספר קבצים ומאחדים. מגבלים ל-15 סניפים כדי לא לחרוג
      // מ-2 דקות (גם 15 סניפים זה ~75k פריטים אחרי dedup, מספיק לרשת).
      let urls: string[] = [];
      const catIdsToTry = [0, 1, 2];
      const prefixesToTry = ['PriceFull', 'Price'];
      for (const cat of catIdsToTry) {
        try {
          const html = await fetchCategoryHtml(cat);
          for (const prefix of prefixesToTry) {
            const found = extractAllFileUrls(html, prefix);
            if (found.length > 0) { urls = found; break; }
          }
          if (urls.length > 0) break;
        } catch { /* ננסה catID הבא */ }
      }
      if (urls.length === 0) {
        return { chainId: 'shufersal', chainName: 'שופרסל', items: [], fetchedFiles: 0, error: 'no_price_file_found' };
      }

      // 30 סניפים במקבילות של 6 - כיסוי טוב יותר של הקטלוג. 15 הקודמים
      // נתנו רק 664 מוצרים כי כל סניף מחזיק תת-קטלוג. 30 סניפים מתפזרים
      // יותר על תתי-מותגים (דיל/שלי/אקספרס) ועל אזורים שונים.
      const MAX_STORES = 30;
      const BATCH = 6;
      const subset = urls.slice(0, MAX_STORES);
      const seenBarcodes = new Set<string>();
      const allItems: ChainPriceItem[] = [];
      let fetched = 0;
      let lastError: string | undefined;

      for (let i = 0; i < subset.length; i += BATCH) {
        const batch = subset.slice(i, i + BATCH);
        const results = await Promise.allSettled(batch.map(async (url) => {
          const { buf, isGzipped } = await downloadBuffer(url);
          return parseXmlBuffer(buf, isGzipped);
        }));
        for (const r of results) {
          if (r.status === 'rejected') {
            lastError = r.reason instanceof Error ? r.reason.message : 'unknown';
            continue;
          }
          fetched++;
          for (const item of r.value) {
            // dedup לפי ברקוד - מוצר זהה בסניפים שונים = רשומה אחת
            if (seenBarcodes.has(item.barcode)) continue;
            seenBarcodes.add(item.barcode);
            allItems.push(item);
          }
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
        const { buf, isGzipped } = await downloadBuffer(url);
        const stores = parseStoresXmlShufersal(buf, isGzipped);
        return { chainId: 'shufersal', chainName: 'שופרסל', stores, fetchedFiles: 1 };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown_error';
      return { chainId: 'shufersal', chainName: 'שופרסל', stores: [], fetchedFiles: 0, error: msg };
    }
  },
};
