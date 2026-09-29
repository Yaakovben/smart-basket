/**
 * laibcatalog.factory.ts
 *
 * פקטורי לרשתות שמפרסמות בפורטל laibcatalog.co.il (ויקטורי, מחסני השוק).
 * API פתוח (אין auth):
 *   1. GET /webapi/api/getbranches?edi={chainCode} → [{number, name}, ...]
 *   2. GET /webapi/api/getfiles?edi={chainCode} → [{branchNumber, fileName, fileType, fileDate, fileSize}, ...]
 *   3. GET /webapi/{chainCode}/{fileName} → קובץ gzip סטנדרטי של Price/Promo/Stores
 *
 * fileType מגיע באותיות קטנות: stores, price, pricefull, promo, promofull (נבדק מול
 * הפורטל ב-2026-09-28). ההשוואה לא תלויה באותיות, כי בעבר הקוד השווה ל-'priceFull'
 * ולכן דילג על כל קובצי המחירים המלאים ולקח רק קובצי עדכון חלקיים.
 *
 * ה-XML בפורמט סטנדרטי (Root/Items/Item) - reuse של parseXmlBuffer/parseStoresXml.
 */

import { logger } from '../../../config/logger';
import { axiosGetWithTlsFallback } from './insecureAgent';
import { parseXmlBuffer, parseStoresXml } from './portalXmlParser';
import { mergeWithCachedListing } from './portalFileCache';
import type {
  ChainAdapter, ChainFetchResult, ChainStoresFetchResult, ChainFileRef,
} from './types';
import type { ChainId } from '../models/Price.model';

const PORTAL_BASE = 'https://laibcatalog.co.il';
const FETCH_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 90_000;
// הגנה מפני קובץ דחוס ענק - ראו הסבר ב-portalFiles.ts
const MAX_COMPRESSED_BYTES = 150 * 1024 * 1024;

interface LaibBranch {
  number: number;
  name: string;
}

interface LaibFile {
  branchNumber: number;
  fileName: string;
  fileType: string;
  fileDate: string;
  fileSize: string;
}

export interface LaibcatalogOptions {
  chainId: ChainId;
  chainName: string;
  /** קוד הרשת הרשמי (13 ספרות) - הפרמטר edi ב-API */
  chainCode: string;
}

const typeOf = (f: LaibFile): string => String(f.fileType || '').toLowerCase();

// הקובץ העדכני לכל סניף מתוך סוגים לפי עדיפות (הראשון עדיף גם אם ישן יותר)
function pickLatestPerBranch(files: LaibFile[], typesByPriority: string[]): LaibFile[] {
  const byBranch = new Map<number, LaibFile>();
  const priority = (f: LaibFile): number => {
    const i = typesByPriority.indexOf(typeOf(f));
    return i === -1 ? 0 : typesByPriority.length - i;
  };
  for (const f of files) {
    if (priority(f) === 0) continue;
    const existing = byBranch.get(f.branchNumber);
    if (!existing) {
      byBranch.set(f.branchNumber, f);
      continue;
    }
    const cmp = priority(f) - priority(existing);
    if (cmp > 0 || (cmp === 0 && f.fileDate > existing.fileDate)) byBranch.set(f.branchNumber, f);
  }
  return Array.from(byBranch.values());
}

function pickLatestStoresFile(files: LaibFile[]): LaibFile | null {
  const stores = files
    .filter(f => typeOf(f).startsWith('store') || /^Stores/i.test(f.fileName))
    .sort((a, b) => b.fileDate.localeCompare(a.fileDate));
  return stores[0] || null;
}

export function createLaibcatalogAdapter(opts: LaibcatalogOptions): ChainAdapter {
  const { chainId, chainName, chainCode } = opts;
  const tag = `[chain:${chainId}]`;

  async function listFiles(): Promise<LaibFile[]> {
    const r = await axiosGetWithTlsFallback<LaibFile[]>(`${PORTAL_BASE}/webapi/api/getfiles?edi=${chainCode}`, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': 'smart-basket/1.0', Accept: 'application/json' },
    });
    if (!Array.isArray(r.data)) throw new Error('laib_files_not_array');
    // הפורטל מציג רק את קובצי היום. בלילה ובבוקר המוקדם משלימים מהרשימה השמורה
    // (קבצים מאתמול עדיין זמינים להורדה), וכל סניף מקבל את העדכני מבין השתיים
    return mergeWithCachedListing(chainId, r.data, f => f.fileName, f => {
      const d = new Date(String(f.fileDate).replace(' ', 'T'));
      return Number.isNaN(d.getTime()) ? null : d;
    });
  }

  async function listBranches(): Promise<LaibBranch[]> {
    const r = await axiosGetWithTlsFallback<LaibBranch[]>(`${PORTAL_BASE}/webapi/api/getbranches?edi=${chainCode}`, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': 'smart-basket/1.0', Accept: 'application/json' },
    });
    if (!Array.isArray(r.data)) throw new Error('laib_branches_not_array');
    return r.data;
  }

  async function downloadFile(fileName: string): Promise<Buffer> {
    const r = await axiosGetWithTlsFallback<ArrayBuffer>(`${PORTAL_BASE}/webapi/${chainCode}/${fileName}`, {
      timeout: DOWNLOAD_TIMEOUT_MS,
      responseType: 'arraybuffer',
      maxContentLength: MAX_COMPRESSED_BYTES,
      maxBodyLength: MAX_COMPRESSED_BYTES,
      headers: { 'User-Agent': 'smart-basket/1.0' },
      validateStatus: s => s < 500,
    });
    if (r.status >= 400) throw new Error(`laib_download_http_${r.status}`);
    return Buffer.from(r.data as ArrayBuffer);
  }

  return {
    chainId,
    chainName,

    async fetchLatestPrices(): Promise<ChainFetchResult> {
      try {
        // PriceFull הוא תמונה מלאה; Price הוא עדכון חלקי ומשמש רק לסניף בלי PriceFull
        const priceFiles = pickLatestPerBranch(await listFiles(), ['pricefull', 'price']);
        if (priceFiles.length === 0) {
          return { chainId, chainName, items: [], fetchedFiles: 0, error: 'no_price_file_found' };
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
              logger.warn(`${tag} file fetch failed: ${r.reason}`);
            }
          }
        }
        return { chainId, chainName, items: allItems, fetchedFiles: fetched };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        logger.warn(`${tag} fetchLatestPrices failed: ${msg}`);
        return { chainId, chainName, items: [], fetchedFiles: 0, error: msg };
      }
    },

    async fetchLatestStores(): Promise<ChainStoresFetchResult> {
      let files: LaibFile[];
      let branches: LaibBranch[];
      try {
        [files, branches] = await Promise.all([listFiles(), listBranches()]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        logger.warn(`${tag} fetchLatestStores failed: ${msg}`);
        return { chainId, chainName, stores: [], fetchedFiles: 0, error: msg };
      }

      // ניסיון קובץ הסניפים המלא (כתובת+קואורדינטות) - מבודד בטרייקאץ' משלו
      // כדי שכשל הורדה/פרסינג לא יבטל את הבקשה כולה, אלא ייפול ל-fallback של
      // שמות-בלבד למטה ("סניפים בלי קואורדינטות" ולא "0 סניפים").
      try {
        const storesFile = pickLatestStoresFile(files);
        if (storesFile) {
          const buf = await downloadFile(storesFile.fileName);
          const stores = parseStoresXml(buf, storesFile.fileName);
          if (stores.length > 0) return { chainId, chainName, stores, fetchedFiles: 1 };
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        logger.warn(`${tag} stores file download/parse failed, falling back to branch names only: ${msg}`);
      }

      // Fallback: רשימת סניפים מ-getbranches (שם בלבד, ללא כתובת/מיקום).
      const stores = branches.map(b => ({ storeId: String(b.number), storeName: b.name }));
      return { chainId, chainName, stores, fetchedFiles: 0 };
    },

    async listPromoFullFiles(): Promise<ChainFileRef[]> {
      return pickLatestPerBranch(await listFiles(), ['promofull']).map(f => ({
        fileName: f.fileName,
        storeId: String(f.branchNumber),
        download: () => downloadFile(f.fileName),
      }));
    },
  };
}
