/**
 * bina.factory.ts
 *
 * פקטורי ל-ChainAdapter עבור רשתות שמפרסמות מחירים בפורטל
 * binaprojects.com (לדוגמה: מעיין 2000, שפע ברכת השם, סופר ספיר).
 *
 * שלא כמו publishedprices.co.il שדורש Cerberus login, פורטל Bina
 * פתוח לציבור ללא אימות. רשימת הקבצים מתקבלת ב-JSON ופורמט הקובץ
 * עצמו זהה: gzipped XML של Price/Stores סטנדרטי - לכן אנחנו ממחזרים
 * את ה-parsers הקיימים מ-publishedPrices.factory.
 *
 * פרוטוקול Bina:
 *   1. GET http://{prefix}.binaprojects.com/MainIO_Hok.aspx?_=chainId&wReshet=הכל&WFileType=N
 *      → JSON: [{ FileNm: "PriceFull-...gz", ... }, ...]
 *   2. GET http://{prefix}.binaprojects.com/Download.aspx?FileNm=XXX
 *      → JSON: [{ SPath: "https://..." }] - URL חתום זמני
 *   3. GET <SPath> → קובץ gzipped XML
 *
 * קודי WFileType: 1=Stores, 2=Price, 3=Promo, 4=PriceFull, 5=PromoFull
 */

import axios from 'axios';
import { logger } from '../../../config/logger';
import { parseXmlBuffer, parseStoresXml } from './publishedPrices.factory';
import type {
  ChainAdapter, ChainFetchResult, ChainStoresFetchResult,
} from './types';
import type { ChainId } from '../models/Price.model';

interface BinaFileEntry {
  FileNm?: string;
  Store?: string;
  TypeFile?: string;
  DateFile?: string;
}

interface BinaSPathEntry {
  SPath?: string;
}

const FILE_TYPE_PRICE_FULL = 4;
const FILE_TYPE_STORES = 1;

export interface BinaOptions {
  chainId: ChainId;
  chainName: string;
  /** prefix של ה-subdomain - למשל "maayan2000" עבור maayan2000.binaprojects.com */
  urlPrefix: string;
  /** chain ID רשמי (13 ספרות) - משמש כפרמטר בקריאות API */
  binaChainId: string;
}

function buildBaseUrl(prefix: string): string {
  // לפי הסקריפר המקורי - http (לא https). אם השרת מאלץ https, axios יעקוב אחרי redirect.
  return `http://${prefix}.binaprojects.com`;
}

// בקשת רשימת קבצים מסוג מסוים. מחזירה מערך ישיר של רשומות JSON.
async function listFiles(
  baseUrl: string,
  binaChainId: string,
  fileType: number,
): Promise<BinaFileEntry[]> {
  const params = new URLSearchParams({
    _: binaChainId,
    wReshet: 'הכל',
    WFileType: String(fileType),
    WDate: '',
    WStore: '',
  });
  const url = `${baseUrl}/MainIO_Hok.aspx?${params.toString()}`;
  const res = await axios.get(url, {
    timeout: 30_000,
    // Bina לא מצריך Cookie אבל לפעמים בודק User-Agent
    headers: { 'User-Agent': 'smart-basket/1.0', 'Accept': 'application/json,text/plain,*/*' },
    // קצת רשתות מחזירות תעודות חלקיות - תואם להגדרת publishedPrices
    validateStatus: s => s < 500,
  });
  if (res.status >= 400) throw new Error(`bina_list_http_${res.status}`);
  const data = res.data;
  if (!Array.isArray(data)) {
    throw new Error('bina_list_not_array');
  }
  return data as BinaFileEntry[];
}

// פותר שם-קובץ ל-URL חתום ומוריד את התוכן (gzipped XML).
async function resolveAndDownload(
  baseUrl: string,
  fileName: string,
): Promise<Buffer> {
  const resolveUrl = `${baseUrl}/Download.aspx?FileNm=${encodeURIComponent(fileName)}`;
  const resolveRes = await axios.get<BinaSPathEntry[]>(resolveUrl, {
    timeout: 30_000,
    headers: { 'User-Agent': 'smart-basket/1.0', 'Accept': 'application/json' },
    validateStatus: s => s < 500,
  });
  if (resolveRes.status >= 400) throw new Error(`bina_resolve_http_${resolveRes.status}`);
  const arr = resolveRes.data;
  if (!Array.isArray(arr) || arr.length === 0 || !arr[0].SPath) {
    throw new Error('bina_resolve_no_spath');
  }
  const sPath = arr[0].SPath;
  const fileRes = await axios.get<ArrayBuffer>(sPath, {
    timeout: 60_000,
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'smart-basket/1.0' },
    maxRedirects: 5,
    validateStatus: s => s < 500,
  });
  if (fileRes.status >= 400) throw new Error(`bina_download_http_${fileRes.status}`);
  return Buffer.from(fileRes.data as ArrayBuffer);
}

// מחלץ את חתימת התאריך משם-קובץ (yyyymmddhhmm).
function extractDateStamp(filename: string): string {
  const m = filename.match(/(\d{12})\.(?:gz|xml)$/i);
  return m ? m[1] : '';
}

// מחלץ את storeId משם-קובץ - תבנית: PriceFull{chainId}-{storeId}-{stamp}.gz
function extractStoreIdFromName(filename: string): string {
  const m = filename.match(/-(\d+)-\d{12}\.(?:gz|xml)$/i);
  return m ? m[1] : '';
}

// מחזיר את הקובץ הטרי ביותר לכל סניף בנפרד (PriceFull). לקובץ Stores
// יש בד"כ אחד לכל הרשת - שם נחזיר את הטרי הכולל.
function pickLatestPerStore(entries: BinaFileEntry[], pattern: RegExp): string[] {
  const matches = entries
    .map(e => e.FileNm || '')
    .filter(name => name && pattern.test(name));
  if (matches.length === 0) return [];
  const latestPerStore = new Map<string, { name: string; stamp: string }>();
  for (const name of matches) {
    const storeId = extractStoreIdFromName(name);
    const stamp = extractDateStamp(name);
    if (!stamp) continue;
    // אם אין storeId (קובץ סניף-לא-ספציפי כמו StoresFull) - storeId="" וכל הקבצים
    // יתחרו על אותו slot - לבחירת הטרי ביותר.
    const key = storeId || 'global';
    const existing = latestPerStore.get(key);
    if (!existing || stamp > existing.stamp) {
      latestPerStore.set(key, { name, stamp });
    }
  }
  return Array.from(latestPerStore.values()).map(v => v.name);
}

export function createBinaAdapter(opts: BinaOptions): ChainAdapter {
  const { chainId, chainName, urlPrefix, binaChainId } = opts;
  const baseUrl = buildBaseUrl(urlPrefix);

  return {
    chainId,
    chainName,

    async fetchLatestPrices(): Promise<ChainFetchResult> {
      try {
        const list = await listFiles(baseUrl, binaChainId, FILE_TYPE_PRICE_FULL);
        const fileNames = pickLatestPerStore(list, /PriceFull.*\.(gz|xml)$/i);
        if (fileNames.length === 0) {
          return { chainId, chainName, items: [], fetchedFiles: 0, error: 'no_price_file_found' };
        }
        // הורדה במקביל בקבוצות של 6 - לא להציף את הפורטל ולא להאריך זמן ריצה.
        const allItems = [];
        const CONCURRENCY = 6;
        let fetched = 0;
        for (let i = 0; i < fileNames.length; i += CONCURRENCY) {
          const batch = fileNames.slice(i, i + CONCURRENCY);
          const settled = await Promise.allSettled(
            batch.map(fn => resolveAndDownload(baseUrl, fn).then(buf => parseXmlBuffer(buf, fn)))
          );
          for (const r of settled) {
            if (r.status === 'fulfilled') {
              allItems.push(...r.value);
              fetched++;
            } else {
              logger.warn(`[bina:${chainId}] file fetch failed: ${r.reason}`);
            }
          }
        }
        if (allItems.length === 0) {
          return { chainId, chainName, items: [], fetchedFiles: fetched, error: 'all_files_empty' };
        }
        return { chainId, chainName, items: allItems, fetchedFiles: fetched };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        logger.warn(`[bina:${chainId}] fetchLatestPrices failed: ${msg}`);
        return { chainId, chainName, items: [], fetchedFiles: 0, error: msg };
      }
    },

    async fetchLatestStores(): Promise<ChainStoresFetchResult> {
      try {
        const list = await listFiles(baseUrl, binaChainId, FILE_TYPE_STORES);
        // קבצי Stores בדרך כלל יחיד לכל הרשת - אם יש כמה, ניקח את העדכני.
        const fileNames = pickLatestPerStore(list, /Stores(Full)?.*\.(gz|xml)$/i);
        if (fileNames.length === 0) {
          return { chainId, chainName, stores: [], fetchedFiles: 0, error: 'no_stores_file_found' };
        }
        const buf = await resolveAndDownload(baseUrl, fileNames[0]);
        const stores = parseStoresXml(buf, fileNames[0]);
        return { chainId, chainName, stores, fetchedFiles: 1 };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        logger.warn(`[bina:${chainId}] fetchLatestStores failed: ${msg}`);
        return { chainId, chainName, stores: [], fetchedFiles: 0, error: msg };
      }
    },
  };
}
