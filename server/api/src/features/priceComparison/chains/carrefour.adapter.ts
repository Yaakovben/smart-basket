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

import { logger } from '../../../config/logger';
import { axiosGetWithTlsFallback } from './insecureAgent';
import { parseXmlBuffer, parseStoresXml } from './portalXmlParser';
import { mergeWithCachedListing } from './portalFileCache';
import { retryDownload } from './downloadRetry';
import type {
  ChainAdapter, ChainFetchResult, ChainStoresFetchResult, ChainFileRef,
} from './types';

const PORTAL_BASE = 'https://prices.carrefour.co.il';
const FETCH_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
// הגנה מפני קובץ דחוס ענק - ראו הסבר ב-portalFiles.ts
const MAX_COMPRESSED_BYTES = 150 * 1024 * 1024;

interface CarrefourFile {
  name: string;
  size: number;
  modified: string;
  // תיקיית היום שבה הקובץ נמצא (לרשומות מהרשימה השמורה: תיקייה של יום קודם)
  path?: string;
}

// מושך את דף הפורטל ומחלץ ממנו path + files שמוטמעים ב-JS.
async function fetchIndex(): Promise<{ path: string; files: CarrefourFile[] }> {
  const res = await axiosGetWithTlsFallback<string>(`${PORTAL_BASE}/`, {
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
  // הפורטל מציג רק את תיקיית היום. בלילה ובבוקר המוקדם משלימים מהרשימה השמורה
  // (קבצים של אתמול עדיין זמינים בתיקייה שלהם), וכל סניף מקבל את העדכני מבין השתיים
  const withPath = files.map(f => ({ ...f, path }));
  const merged = await mergeWithCachedListing('carrefour', withPath, f => `${f.path}/${f.name}`, f => {
    const stamp = extractStamp(f.name);
    if (!stamp) return null;
    const d = new Date(`${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  });
  return { path, files: merged };
}

// התיקייה של קובץ: מהרשומה עצמה, או תיקיית היום
const folderOf = (files: CarrefourFile[], name: string, today: string): string =>
  files.find(f => f.name === name)?.path ?? today;

// מחלץ חותמת תאריך משם הקובץ. Carrefour משתמשים בכמה תבניות:
// ישן: PriceFull...-20260501150700.gz (12 ספרות רצופות)
// חדש: PriceFull...-20260510-230012.gz (8 ספרות + מקף + 6 ספרות)
// תופס את שניהם ומחזיר מחרוזת ניתנת להשוואה לקסיקוגרפית (ללא מקפים).
function extractStamp(filename: string): string {
  const newFmt = filename.match(/(\d{8})-(\d{6})\.(?:gz|xml)$/i);
  if (newFmt) return newFmt[1] + newFmt[2];
  const oldFmt = filename.match(/(\d{12})\.(?:gz|xml)$/i);
  return oldFmt ? oldFmt[1] : '';
}

// מחלץ את חתימת הסניף משם-קובץ. תבניות (Prefix = PriceFull / PromoFull):
// ישן: {Prefix}{chainId}-{storeId}-DATETIME12.gz
// חדש: {Prefix}{chainId}-{subChain}-{storeId}-DATE8-TIME6.gz
// key = מפתח ייחודי לסניף (subChain-storeId), storeId = מזהה הסניף עצמו
function extractStoreId(filename: string, prefix = 'PriceFull'): { key: string; storeId: string } | null {
  // נסה קודם את הפורמט החדש (3 חלקים מספריים אחרי chainId)
  const newFmt = filename.match(new RegExp(`^${prefix}\\d+-(\\d+)-(\\d+)-\\d{8}-\\d{6}\\.(?:gz|xml)$`, 'i'));
  if (newFmt) return { key: `${newFmt[1]}-${newFmt[2]}`, storeId: newFmt[2] };
  // פורמט ישן
  const oldFmt = filename.match(new RegExp(`^${prefix}\\d+-(\\d+)-\\d{12}\\.(?:gz|xml)$`, 'i'));
  return oldFmt ? { key: oldFmt[1], storeId: oldFmt[1] } : null;
}

// בוחר את הקובץ הטרי ביותר לכל סניף בנפרד. הפורטל מפרסם 1+ קובץ פר-סניף
// בכל יום (5 בבוקר עד 23:00) - אנחנו רוצים רק את הטרי לכל סניף, אבל את
// כל הסניפים. אחרת נפספס סניפים שפרסמו בשעה אחרת.
function pickLatestPerStore(files: CarrefourFile[], prefix: 'PriceFull' | 'PromoFull'): Array<{ name: string; storeId: string }> {
  // קיבוץ לפי סניף, בחירת stamp המאוחר ביותר לכל סניף
  const latestPerStore = new Map<string, { name: string; stamp: string; storeId: string }>();
  for (const { name } of files) {
    const store = extractStoreId(name, prefix);
    const stamp = extractStamp(name);
    if (!store || !stamp) continue;
    const existing = latestPerStore.get(store.key);
    if (!existing || stamp > existing.stamp) {
      latestPerStore.set(store.key, { name, stamp, storeId: store.storeId });
    }
  }
  return Array.from(latestPerStore.values()).map(v => ({ name: v.name, storeId: v.storeId }));
}

function pickLatestPriceFullBatch(files: CarrefourFile[]): string[] {
  return pickLatestPerStore(files, 'PriceFull').map(f => f.name);
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
  const res = await axiosGetWithTlsFallback<ArrayBuffer>(url, {
    timeout: DOWNLOAD_TIMEOUT_MS,
    responseType: 'arraybuffer',
    maxContentLength: MAX_COMPRESSED_BYTES,
    maxBodyLength: MAX_COMPRESSED_BYTES,
    headers: { 'User-Agent': 'smart-basket/1.0' },
    validateStatus: s => s < 500,
  });
  if (res.status >= 400) throw new Error(`carrefour_download_http_${res.status}`);
  return Buffer.from(res.data as ArrayBuffer);
}

// מזהה הסניף לפי שם הקובץ, ולא לפי השדה שבתוכו. בסניפים 400 עד 473 השדה שבתוך
// הקובץ הוא מספור ישן (למשל 117 בקובץ של סניף 407, "בעיר חפץ חיים" בפתח תקווה), ו-117
// הוא סניף אחר לגמרי ("סינמה סיטי" בבאר שבע). כך נרשמו מחירים של סניף אחד על סניף
// אחר, ו-73 סניפים נשארו בלי מחיר. המספר בשם הקובץ הוא זה שבקובץ הסניפים הרשמי.
// נבדק מול הפורטל ב-29.9.2026.
export function withFileStoreId<T extends { storeId?: string }>(items: T[], filename: string): T[] {
  const storeId = extractStoreId(filename)?.storeId;
  if (storeId) for (const it of items) it.storeId = storeId;
  return items;
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
          batch.map(fn => retryDownload(() => downloadFile(folderOf(files, fn, path), fn)).then(buf => withFileStoreId(parseXmlBuffer(buf, fn), fn)))
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
      const buf = await downloadFile(folderOf(files, fileName, path), fileName);
      const stores = parseStoresXml(buf, fileName);
      return { chainId: 'carrefour', chainName: 'Carrefour / יינות ביתן', stores, fetchedFiles: 1 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      logger.warn(`[chain:carrefour] fetchLatestStores failed: ${msg}`);
      return { chainId: 'carrefour', chainName: 'Carrefour / יינות ביתן', stores: [], fetchedFiles: 0, error: msg };
    }
  },

  async listPromoFullFiles(): Promise<ChainFileRef[]> {
    const { path, files } = await fetchIndex();
    return pickLatestPerStore(files, 'PromoFull').map(f => ({
      fileName: f.name,
      storeId: f.storeId,
      download: () => downloadFile(folderOf(files, f.name, path), f.name),
    }));
  },
};
