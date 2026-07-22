/**
 * publishedPrices.factory.ts
 *
 * פקטורי ליצירת ChainAdapter לרשתות שמפרסמות מחירים בפורטל
 * url.publishedprices.co.il (Cerberus login + XML gzipped).
 *
 * רוב רשתות השופרמרקט בישראל משתמשות בפורטל הזה. לכל רשת יש
 * משתמש ייחודי (בד"כ ללא סיסמה). הקוד זהה — משתנים רק CREDENTIALS.
 *
 * שימוש:
 *   export const ramiLevyAdapter = createPublishedPricesAdapter({
 *     chainId: 'rami_levy',
 *     chainName: 'רמי לוי',
 *     username: 'RamiLevy',
 *   });
 */

import { logger } from '../../../config/logger';
import { tryAuthenticateWithCandidates, withRetry } from './portalAuth';
import { listLatestMatchingFile, listLatestPriceFullFile, downloadFile } from './portalFiles';
import { parseXmlBuffer, parseStoresXml } from './portalXmlParser';
import type {
  ChainAdapter, ChainFetchResult,
  ChainStoresFetchResult,
} from './types';
import type { ChainId } from '../models/Price.model';

export interface PublishedPricesOptions {
  chainId: ChainId;
  chainName: string;
  /**
   * שם המשתמש בפורטל. אפשר לספק מערך מועמדים והפקטורי ינסה אותם בסדר
   * עד שאחד יצליח (שימושי כשלא ידוע ה-username המדויק של רשת).
   */
  username: string | string[];
  /** סיסמה - ברוב הרשתות ריקה */
  password?: string;
}

export function createPublishedPricesAdapter(options: PublishedPricesOptions): ChainAdapter {
  const { chainId, chainName, username, password = '' } = options;

  const tryAuthenticate = () => tryAuthenticateWithCandidates(chainId, username, password);

  return {
    chainId,
    chainName,
    async fetchLatestPrices(): Promise<ChainFetchResult> {
      try {
        return await withRetry(async () => {
          const { client, csrftoken } = await tryAuthenticate();
          const filename = await listLatestPriceFullFile(client, csrftoken, chainId);
          if (!filename) {
            return { chainId, chainName, items: [], fetchedFiles: 0, error: 'no_price_file_found' };
          }
          const buf = await downloadFile(client, filename);
          const items = parseXmlBuffer(buf, filename);
          if (items.length === 0) {
            logger.warn(`[chain:${chainId}] file '${filename}' parsed to 0 items - schema mismatch?`);
          }
          return { chainId, chainName, items, fetchedFiles: 1 };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown_error';
        logger.warn(`[chain:${chainId}] fetchLatestPrices failed: ${msg}`);
        return { chainId, chainName, items: [], fetchedFiles: 0, error: msg };
      }
    },
    async fetchLatestStores(): Promise<ChainStoresFetchResult> {
      try {
        return await withRetry(async () => {
          const { client, csrftoken } = await tryAuthenticate();
          // מנסים כמה תבניות שמות נפוצות לקובץ הסניפים בפורטל.
          // יש רשתות שמפרסמות 'StoresFull*', יש 'Stores*', ויש 'Store*' (יחיד).
          // patterns מחמירים - חייבים להתחיל ב-Stores/StoreFull/Branches.
          // ההגבלה הזו חשובה: regex רחב כמו /Store.../ מתפס גם StoreOpeningHours
          // וקבצים אחרים שגורמים ל-parseStoresXml להיכשל ב-Maximum nested tags.
          const patterns: Array<{ search: string; regex: RegExp }> = [
            { search: 'StoresFull', regex: /^StoresFull[-_.0-9]/i },
            { search: 'Stores', regex: /^Stores[-_.0-9]/i },
            { search: 'StoreFull', regex: /^StoreFull[-_.0-9]/i },
            { search: 'Branches', regex: /^Branches?[-_.0-9]/i },
          ];
          let filename: string | null = null;
          for (const p of patterns) {
            filename = await listLatestMatchingFile(client, csrftoken, p.search, p.regex);
            if (filename) break;
          }
          if (!filename) {
            return { chainId, chainName, stores: [], fetchedFiles: 0, error: 'no_stores_file_found' };
          }
          const buf = await downloadFile(client, filename);
          // מגנים מפני קבצים פגומים - אם parseStoresXml זורק, מחזירים שגיאה
          // נקייה במקום לקרוס.
          try {
            const stores = parseStoresXml(buf, filename);
            return { chainId, chainName, stores, fetchedFiles: 1 };
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'parse_failed';
            logger.warn(`[chain:${chainId}] stores parse failed for '${filename}': ${msg}`);
            return { chainId, chainName, stores: [], fetchedFiles: 0, error: `stores_parse_failed:${msg}` };
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown_error';
        return { chainId, chainName, stores: [], fetchedFiles: 0, error: msg };
      }
    },
  };
}
