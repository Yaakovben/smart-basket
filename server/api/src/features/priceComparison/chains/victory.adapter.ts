/**
 * victory.adapter.ts
 *
 * ויקטורי - מקור חדש בלבד (publishedprices.co.il לא משמש יותר).
 * הפורטל הרשמי: laibcatalog.co.il עם API פתוח (אין auth).
 *
 * שלוש נקודות קצה:
 *   1. GET /webapi/api/getbranches?edi={chainId} → [{number, name}, ...]
 *   2. GET /webapi/api/getfiles?edi={chainId} → [{branchNumber, fileName, fileType, fileDate, fileSize}, ...]
 *   3. GET /webapi/{chainId}/{fileName} → קובץ gzip סטנדרטי של Price/Stores
 *
 * ChainId רשמי: 7290696200003.
 *
 * ה-XML בפורמט סטנדרטי (Root/Items/Item) - reuse של parseXmlBuffer/parseStoresXml.
 */

import axios from 'axios';
import { logger } from '../../../config/logger';
import { parseXmlBuffer, parseStoresXml } from './publishedPrices.factory';
import type {
  ChainAdapter, ChainFetchResult, ChainStoresFetchResult,
} from './types';

const PORTAL_BASE = 'https://laibcatalog.co.il';
const VICTORY_CHAIN_ID = '7290696200003';
const FETCH_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;

interface VictoryBranch {
  number: number;
  name: string;
}

interface VictoryFile {
  branchNumber: number;
  fileName: string;
  fileType: 'price' | 'priceFull' | 'promo' | 'promoFull' | 'store' | string;
  fileDate: string;
  fileSize: string;
}

async function listFiles(): Promise<VictoryFile[]> {
  const url = `${PORTAL_BASE}/webapi/api/getfiles?edi=${VICTORY_CHAIN_ID}`;
  const r = await axios.get<VictoryFile[]>(url, {
    timeout: FETCH_TIMEOUT_MS,
    headers: { 'User-Agent': 'smart-basket/1.0', Accept: 'application/json' },
  });
  if (!Array.isArray(r.data)) throw new Error('victory_files_not_array');
  return r.data;
}

async function listBranches(): Promise<VictoryBranch[]> {
  const url = `${PORTAL_BASE}/webapi/api/getbranches?edi=${VICTORY_CHAIN_ID}`;
  const r = await axios.get<VictoryBranch[]>(url, {
    timeout: FETCH_TIMEOUT_MS,
    headers: { 'User-Agent': 'smart-basket/1.0', Accept: 'application/json' },
  });
  if (!Array.isArray(r.data)) throw new Error('victory_branches_not_array');
  return r.data;
}

async function downloadFile(fileName: string): Promise<Buffer> {
  const url = `${PORTAL_BASE}/webapi/${VICTORY_CHAIN_ID}/${fileName}`;
  const r = await axios.get<ArrayBuffer>(url, {
    timeout: DOWNLOAD_TIMEOUT_MS,
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'smart-basket/1.0' },
    validateStatus: s => s < 500,
  });
  if (r.status >= 400) throw new Error(`victory_download_http_${r.status}`);
  return Buffer.from(r.data as ArrayBuffer);
}

// בוחר את קובץ המחירים הטרי ביותר לכל סניף.
// עדיפות: priceFull > price (PriceFull הוא snapshot מלא; price הוא delta).
function pickLatestPricePerBranch(files: VictoryFile[]): VictoryFile[] {
  const pricesByBranch = new Map<number, VictoryFile>();
  const priority = (t: string): number => (t === 'priceFull' ? 2 : t === 'price' ? 1 : 0);
  for (const f of files) {
    if (priority(f.fileType) === 0) continue;
    const existing = pricesByBranch.get(f.branchNumber);
    if (!existing) {
      pricesByBranch.set(f.branchNumber, f);
      continue;
    }
    const cmpType = priority(f.fileType) - priority(existing.fileType);
    if (cmpType > 0 || (cmpType === 0 && f.fileDate > existing.fileDate)) {
      pricesByBranch.set(f.branchNumber, f);
    }
  }
  return Array.from(pricesByBranch.values());
}

function pickLatestStoresFile(files: VictoryFile[]): VictoryFile | null {
  const stores = files
    .filter(f => f.fileType === 'store' || /^Stores/i.test(f.fileName))
    .sort((a, b) => b.fileDate.localeCompare(a.fileDate));
  return stores[0] || null;
}

export const victoryAdapter: ChainAdapter = {
  chainId: 'victory',
  chainName: 'ויקטורי',

  async fetchLatestPrices(): Promise<ChainFetchResult> {
    try {
      const files = await listFiles();
      const priceFiles = pickLatestPricePerBranch(files);
      if (priceFiles.length === 0) {
        return { chainId: 'victory', chainName: 'ויקטורי', items: [], fetchedFiles: 0, error: 'no_price_file_found' };
      }
      const allItems = [];
      const CONCURRENCY = 6;
      let fetched = 0;
      for (let i = 0; i < priceFiles.length; i += CONCURRENCY) {
        const batch = priceFiles.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(
          batch.map(f => downloadFile(f.fileName).then(buf => parseXmlBuffer(buf, f.fileName)))
        );
        for (const r of settled) {
          if (r.status === 'fulfilled') {
            allItems.push(...r.value);
            fetched++;
          } else {
            logger.warn(`[chain:victory] file fetch failed: ${r.reason}`);
          }
        }
      }
      return { chainId: 'victory', chainName: 'ויקטורי', items: allItems, fetchedFiles: fetched };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      logger.warn(`[chain:victory] fetchLatestPrices failed: ${msg}`);
      return { chainId: 'victory', chainName: 'ויקטורי', items: [], fetchedFiles: 0, error: msg };
    }
  },

  async fetchLatestStores(): Promise<ChainStoresFetchResult> {
    try {
      const [files, branches] = await Promise.all([listFiles(), listBranches()]);
      const storesFile = pickLatestStoresFile(files);
      if (storesFile) {
        const buf = await downloadFile(storesFile.fileName);
        const stores = parseStoresXml(buf, storesFile.fileName);
        if (stores.length > 0) {
          return { chainId: 'victory', chainName: 'ויקטורי', stores, fetchedFiles: 1 };
        }
      }
      // Fallback: רשימת סניפים מ-getbranches (שם בלבד, ללא כתובת/מיקום).
      const stores = branches.map(b => ({
        storeId: String(b.number),
        storeName: b.name,
      }));
      return { chainId: 'victory', chainName: 'ויקטורי', stores, fetchedFiles: 0 };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      logger.warn(`[chain:victory] fetchLatestStores failed: ${msg}`);
      return { chainId: 'victory', chainName: 'ויקטורי', stores: [], fetchedFiles: 0, error: msg };
    }
  },
};
