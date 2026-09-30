/**
 * hazi-hinam.adapter.ts
 *
 * חצי חינם - פורטל שקיפות עצמאי באתר הרשת: https://shop.hazi-hinam.co.il/Prices
 * (דף "שקיפות מחירים" באתר hazi-hinam.co.il מפנה אליו). פתוח, בלי login.
 * קוד רשת רשמי: 7290700100008. אומת ב-2026-09-28.
 *
 * מבנה: טבלת HTML עם דפים. פרמטרים: d=YYYY-MM-DD (יום פרסום), t=סוג, p=דף.
 *   t=1 מחירים (Price + PriceFull), t=2 מבצעים (Promo + PromoFull), t=3 סניפים (StoresFull)
 * הקבצים עצמם ב-Azure blob של הרשת:
 *   https://hazihinamprod01.blob.core.windows.net/regulatories/<FileName>.gz
 *
 * כל סניף מפרסם בשעה אחרת, ולכן סורקים את היום ושני הימים הקודמים ולוקחים
 * לכל סניף את הקובץ העדכני. ה-XML בפורמט הסטנדרטי (Root/Items/Item).
 */

import { logger } from '../../../config/logger';
import { axiosGetWithTlsFallback } from './insecureAgent';
import { parseXmlBuffer, parseStoresXml } from './portalXmlParser';
import { retryDownload } from './downloadRetry';
import { PriceRows } from './priceRows';
import type {
  ChainAdapter, ChainFetchResult, ChainStoresFetchResult, ChainFileRef,
} from './types';

const CHAIN_ID = 'hazi_hinam' as const;
const CHAIN_NAME = 'חצי חינם';
const LISTING_URL = 'https://shop.hazi-hinam.co.il/Prices';
const FILE_HOST = 'https://hazihinamprod01.blob.core.windows.net/regulatories/';
const FETCH_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;
const MAX_COMPRESSED_BYTES = 150 * 1024 * 1024;
const MAX_PAGES = 30;
const DAYS_BACK = 2;

const TYPE_PRICES = 1;
const TYPE_PROMOS = 2;
const TYPE_STORES = 3;

// PriceFull7290700100008-000-219-20260928-135600.gz
const PER_STORE_NAME = /^(PriceFull|PromoFull|Price|Promo)(\d+)-(\d+)-(\d+)-(\d{8})-(\d{6})\.gz$/i;
const LINK = /href="(https:\/\/hazihinamprod01\.blob\.core\.windows\.net\/regulatories\/([^"?]+\.gz))[^"]*"/gi;

// יום בפורמט YYYY-MM-DD לפי שעון ישראל
function israelDay(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(d);
}

async function fetchListingPage(type: number, day: string, page: number): Promise<string> {
  const url = `${LISTING_URL}?p=${page}&s=&f=null&t=${type}&d=${day}`;
  const res = await axiosGetWithTlsFallback<string>(url, {
    timeout: FETCH_TIMEOUT_MS,
    headers: { 'User-Agent': 'smart-basket/1.0', Accept: 'text/html' },
    responseType: 'text',
  });
  return res.data;
}

// כל שמות הקבצים (עם כתובת) מסוג נתון בימים האחרונים, מכל הדפים
async function listFiles(type: number): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (let daysAgo = 0; daysAgo <= DAYS_BACK; daysAgo++) {
    const day = israelDay(daysAgo);
    for (let page = 1; page <= MAX_PAGES; page++) {
      const html = await fetchListingPage(type, day, page);
      let added = 0;
      for (const m of html.matchAll(LINK)) {
        if (files.has(m[2])) continue;
        files.set(m[2], m[1]);
        added++;
      }
      // דף בלי קבצים חדשים = סוף הרשימה של היום
      if (added === 0) break;
    }
  }
  return files;
}

function pickLatestPerStore(files: Map<string, string>, prefix: 'PriceFull' | 'PromoFull'): Array<{ name: string; url: string; storeId: string }> {
  const latest = new Map<string, { name: string; url: string; storeId: string; stamp: string }>();
  for (const [name, url] of files) {
    const m = name.match(PER_STORE_NAME);
    if (!m || m[1].toLowerCase() !== prefix.toLowerCase()) continue;
    const key = `${m[3]}-${m[4]}`;
    const stamp = `${m[5]}${m[6]}`;
    const existing = latest.get(key);
    if (!existing || stamp > existing.stamp) latest.set(key, { name, url, storeId: m[4], stamp });
  }
  return [...latest.values()];
}

async function download(url: string): Promise<Buffer> {
  // רק מהאחסון של הרשת: הכתובת נלקחת מדף חיצוני, לא מורידים מכל מקום שהוא מפנה אליו
  if (!url.startsWith(FILE_HOST)) throw new Error('hazi_hinam_unexpected_file_host');
  const res = await axiosGetWithTlsFallback<ArrayBuffer>(url, {
    timeout: DOWNLOAD_TIMEOUT_MS,
    responseType: 'arraybuffer',
    maxContentLength: MAX_COMPRESSED_BYTES,
    maxBodyLength: MAX_COMPRESSED_BYTES,
    headers: { 'User-Agent': 'smart-basket/1.0' },
    validateStatus: s => s < 500,
  });
  if (res.status >= 400) throw new Error(`hazi_hinam_download_http_${res.status}`);
  return Buffer.from(res.data as ArrayBuffer);
}

export const haziHinamAdapter: ChainAdapter = {
  chainId: CHAIN_ID,
  chainName: CHAIN_NAME,

  async fetchLatestPrices(): Promise<ChainFetchResult> {
    try {
      const files = pickLatestPerStore(await listFiles(TYPE_PRICES), 'PriceFull');
      if (files.length === 0) {
        return { chainId: CHAIN_ID, chainName: CHAIN_NAME, items: [], fetchedFiles: 0, error: 'no_price_file_found' };
      }
      const allItems = new PriceRows();
      const CONCURRENCY = 4;
      let fetched = 0;
      for (let i = 0; i < files.length; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(batch.map(f => retryDownload(() => download(f.url)).then(buf => parseXmlBuffer(buf, f.name))));
        for (const r of settled) {
          if (r.status === 'fulfilled') {
            allItems.add(r.value);
            fetched++;
          } else {
            logger.warn(`[chain:${CHAIN_ID}] file fetch failed: ${r.reason}`);
          }
        }
      }
      return { chainId: CHAIN_ID, chainName: CHAIN_NAME, items: allItems, fetchedFiles: fetched };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      logger.warn(`[chain:${CHAIN_ID}] fetchLatestPrices failed: ${msg}`);
      return { chainId: CHAIN_ID, chainName: CHAIN_NAME, items: [], fetchedFiles: 0, error: msg };
    }
  },

  async fetchLatestStores(): Promise<ChainStoresFetchResult> {
    try {
      const files = await listFiles(TYPE_STORES);
      const latest = [...files.entries()]
        .filter(([name]) => /^Stores(Full)?\d/i.test(name))
        .sort(([a], [b]) => b.localeCompare(a))[0];
      if (!latest) return { chainId: CHAIN_ID, chainName: CHAIN_NAME, stores: [], fetchedFiles: 0, error: 'no_stores_file_found' };
      const stores = parseStoresXml(await download(latest[1]), latest[0]);
      return { chainId: CHAIN_ID, chainName: CHAIN_NAME, stores, fetchedFiles: 1 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      logger.warn(`[chain:${CHAIN_ID}] fetchLatestStores failed: ${msg}`);
      return { chainId: CHAIN_ID, chainName: CHAIN_NAME, stores: [], fetchedFiles: 0, error: msg };
    }
  },

  async listPromoFullFiles(): Promise<ChainFileRef[]> {
    return pickLatestPerStore(await listFiles(TYPE_PROMOS), 'PromoFull').map(f => ({
      fileName: f.name,
      storeId: f.storeId,
      download: () => download(f.url),
    }));
  },
};
