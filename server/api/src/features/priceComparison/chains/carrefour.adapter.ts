/**
 * carrefour.adapter.ts
 *
 * Carrefour / יינות ביתן - פורטל שקיפות עצמאי בכתובת prices.carrefour.co.il.
 * הפורטל פתוח לציבור ללא אימות (כמו prices.shufersal.co.il - אבל מבנה שונה).
 *
 * מבנה: דף HTML בודד עם שני משתנים מוטמעים ב-JS:
 *   const path = '20260501';                    // תאריך כתיקייה
 *   const files = [{name, size, modified}, ...];// רשימת קבצים
 * URL הורדה: https://prices.carrefour.co.il/{path}/{filename}
 *
 * ChainId רשמי: 7290055700007 (יינות ביתן/Carrefour - מותגים מאוחדים מ-2024).
 *
 * ה-XML של PriceFull/StoresFull זהה במבנה לפורמט publishedprices, ולכן
 * אנחנו ממחזרים את parseXmlBuffer/parseStoresXml מהפקטורי הקיים.
 */

import axios from 'axios';
import { logger } from '../../../config/logger';
import { parseXmlBuffer, parseStoresXml } from './publishedPrices.factory';
import type {
  ChainAdapter, ChainFetchResult, ChainStoresFetchResult,
} from './types';

const PORTAL_BASE = 'https://prices.carrefour.co.il';
const FETCH_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;

interface CarrefourFile {
  name: string;
  size: number;
  modified: string;
}

// מושך את דף הפורטל ומחלץ ממנו path + files שמוטמעים ב-JS.
async function fetchIndex(): Promise<{ path: string; files: CarrefourFile[] }> {
  const res = await axios.get<string>(`${PORTAL_BASE}/`, {
    timeout: FETCH_TIMEOUT_MS,
    headers: { 'User-Agent': 'smart-basket/1.0', 'Accept': 'text/html' },
    responseType: 'text',
  });
  const html = res.data;
  const pathMatch = html.match(/const\s+path\s*=\s*['"]([^'"]+)['"]/);
  const filesMatch = html.match(/const\s+files\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!pathMatch || !filesMatch) {
    throw new Error('carrefour_html_no_path_or_files');
  }
  const path = pathMatch[1];
  let files: CarrefourFile[];
  try {
    files = JSON.parse(filesMatch[1]);
  } catch {
    throw new Error('carrefour_files_json_parse_failed');
  }
  return { path, files };
}

// מחלץ חותמת תאריך משם הקובץ - תבנית: PriceFull...-DATETIME12.gz
function extractStamp(filename: string): string {
  const m = filename.match(/(\d{12})\.(?:gz|xml)$/i);
  return m ? m[1] : '';
}

// מחלץ את חתימת הסניף משם-קובץ - תבנית: PriceFull{chainId}-{storeId}-{stamp}.gz
function extractStoreId(filename: string): string {
  const m = filename.match(/PriceFull\d+-(\d+)-\d{12}\.(?:gz|xml)$/i);
  return m ? m[1] : '';
}

// בוחר את הקובץ הטרי ביותר לכל סניף בנפרד. הפורטל מפרסם 1+ קובץ פר-סניף
// בכל יום (5 בבוקר עד 23:00) - אנחנו רוצים רק את הטרי לכל סניף, אבל את
// כל הסניפים. אחרת נפספס סניפים שפרסמו בשעה אחרת.
function pickLatestPriceFullBatch(files: CarrefourFile[]): string[] {
  const matches = files
    .map(f => f.name)
    .filter(name => /^PriceFull\d+/i.test(name) && /\.(gz|xml)$/i.test(name));
  if (matches.length === 0) return [];
  // קיבוץ לפי storeId, בחירת stamp המאוחר ביותר לכל סניף
  const latestPerStore = new Map<string, { name: string; stamp: string }>();
  for (const name of matches) {
    const storeId = extractStoreId(name);
    const stamp = extractStamp(name);
    if (!storeId || !stamp) continue;
    const existing = latestPerStore.get(storeId);
    if (!existing || stamp > existing.stamp) {
      latestPerStore.set(storeId, { name, stamp });
    }
  }
  return Array.from(latestPerStore.values()).map(v => v.name);
}

function pickLatestStoresFile(files: CarrefourFile[]): string | null {
  const matches = files
    .map(f => f.name)
    .filter(name => /^Stores(Full)?\d+/i.test(name) && /\.(gz|xml)$/i.test(name))
    .sort((a, b) => b.localeCompare(a));
  return matches[0] || null;
}

async function downloadFile(path: string, filename: string): Promise<Buffer> {
  const url = `${PORTAL_BASE}/${path}/${filename}`;
  const res = await axios.get<ArrayBuffer>(url, {
    timeout: DOWNLOAD_TIMEOUT_MS,
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'smart-basket/1.0' },
    validateStatus: s => s < 500,
  });
  if (res.status >= 400) throw new Error(`carrefour_download_http_${res.status}`);
  return Buffer.from(res.data as ArrayBuffer);
}

export const carrefourAdapter: ChainAdapter = {
  chainId: 'carrefour',
  chainName: 'Carrefour / יינות ביתן',

  async fetchLatestPrices(): Promise<ChainFetchResult> {
    try {
      const { path, files } = await fetchIndex();
      const fileNames = pickLatestPriceFullBatch(files);
      if (fileNames.length === 0) {
        return { chainId: 'carrefour', chainName: 'Carrefour / יינות ביתן', items: [], fetchedFiles: 0, error: 'no_price_file_found' };
      }
      const allItems = [];
      const CONCURRENCY = 6;
      let fetched = 0;
      for (let i = 0; i < fileNames.length; i += CONCURRENCY) {
        const batch = fileNames.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(
          batch.map(fn => downloadFile(path, fn).then(buf => parseXmlBuffer(buf, fn)))
        );
        for (const r of settled) {
          if (r.status === 'fulfilled') {
            allItems.push(...r.value);
            fetched++;
          } else {
            logger.warn(`[chain:carrefour] file fetch failed: ${r.reason}`);
          }
        }
      }
      return { chainId: 'carrefour', chainName: 'Carrefour / יינות ביתן', items: allItems, fetchedFiles: fetched };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      logger.warn(`[chain:carrefour] fetchLatestPrices failed: ${msg}`);
      return { chainId: 'carrefour', chainName: 'Carrefour / יינות ביתן', items: [], fetchedFiles: 0, error: msg };
    }
  },

  async fetchLatestStores(): Promise<ChainStoresFetchResult> {
    try {
      const { path, files } = await fetchIndex();
      const fileName = pickLatestStoresFile(files);
      if (!fileName) {
        return { chainId: 'carrefour', chainName: 'Carrefour / יינות ביתן', stores: [], fetchedFiles: 0, error: 'no_stores_file_found' };
      }
      const buf = await downloadFile(path, fileName);
      const stores = parseStoresXml(buf, fileName);
      return { chainId: 'carrefour', chainName: 'Carrefour / יינות ביתן', stores, fetchedFiles: 1 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      logger.warn(`[chain:carrefour] fetchLatestStores failed: ${msg}`);
      return { chainId: 'carrefour', chainName: 'Carrefour / יינות ביתן', stores: [], fetchedFiles: 0, error: msg };
    }
  },
};
