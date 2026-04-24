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

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { XMLParser } from 'fast-xml-parser';
import { gunzipSync } from 'zlib';
import type {
  ChainAdapter, ChainFetchResult, ChainPriceItem,
  ChainStoreItem, ChainStoresFetchResult,
} from './types';
import type { ChainId } from '../models/Price.model';

const PORTAL_BASE = 'https://url.publishedprices.co.il';

export interface PublishedPricesOptions {
  chainId: ChainId;
  chainName: string;
  /** שם המשתמש בפורטל (למשל "osherad", "RamiLevy", "TivTaam") */
  username: string;
  /** סיסמה - ברוב הרשתות ריקה */
  password?: string;
}

interface FileEntry {
  name?: string;
  fname?: string;
  DT_RowId?: string;
  size?: number;
  time?: string;
  type?: string;
}

interface DirListResponse {
  aaData?: FileEntry[];
}

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

// חילוץ csrftoken מ-meta של Cerberus
function extractCsrf(html: string): string {
  const m = html.match(/name=['"]csrftoken['"]\s+content=['"]([^'"]+)['"]/);
  return m ? m[1] : '';
}

async function createAuthenticatedClient(username: string, password: string): Promise<{ client: AxiosInstance; csrftoken: string }> {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      baseURL: PORTAL_BASE,
      jar,
      withCredentials: true,
      timeout: 60_000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)',
      },
    })
  );

  // צעד 1: GET /login — session cookie + csrftoken
  const loginPage = await client.get<string>('/login');
  const initialCsrf = extractCsrf(loginPage.data);

  // צעד 2: POST /login/user — התחברות
  const form = new URLSearchParams();
  form.append('r', '');
  form.append('username', username);
  form.append('password', password);
  form.append('Submit', 'Sign in');
  form.append('csrftoken', initialCsrf);

  await client.post('/login/user', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${PORTAL_BASE}/login`,
      Origin: PORTAL_BASE,
      'X-CSRFToken': initialCsrf,
    },
    maxRedirects: 5,
  });

  // צעד 3: GET /file — csrftoken חדש לבקשות dir/download
  const filePage = await client.get<string>('/file');
  const sessionCsrf = extractCsrf(filePage.data);

  return { client, csrftoken: sessionCsrf };
}

// בקשת list של קבצים/תיקיות מנתיב נתון בפורטל
async function listDir(client: AxiosInstance, csrftoken: string, cd: string, search: string): Promise<FileEntry[]> {
  const form = new URLSearchParams({
    sEcho: '1',
    iDisplayStart: '0',
    iDisplayLength: '1000',
    sSearch: search,
    cd,
    csrftoken,
  });

  const res = await client.post<DirListResponse>('/file/json/dir', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': csrftoken,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${PORTAL_BASE}/file`,
    },
  });

  return res.data?.aaData || [];
}

// מאתר את הקובץ החדש ביותר שמתאים ל-pattern מסוים (PriceFull / StoresFull).
// מנסה גם בשורש וגם בתת-תיקיות תאריכים (חלק מהרשתות).
async function listLatestMatchingFile(
  client: AxiosInstance,
  csrftoken: string,
  searchTerm: string,
  pattern: RegExp
): Promise<string | null> {
  const rootFiles = await listDir(client, csrftoken, '/', searchTerm);
  const rootMatches = rootFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '' }))
    .filter(f => pattern.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  if (rootMatches.length > 0) return rootMatches[0].name;

  const allFiles = await listDir(client, csrftoken, '/', '');
  const subDirs = allFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '', type: f.type }))
    .filter(f => f.type === 'd' && /^\d{4}-\d{2}-\d{2}|^\d{8}/.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  for (const dir of subDirs.slice(0, 3)) {
    const subFiles = await listDir(client, csrftoken, `/${dir.name}`, searchTerm);
    const matches = subFiles
      .map(f => ({ name: f.fname || f.name || f.DT_RowId || '' }))
      .filter(f => pattern.test(f.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    if (matches.length > 0) return `${dir.name}/${matches[0].name}`;
  }

  return null;
}

async function listLatestPriceFullFile(client: AxiosInstance, csrftoken: string): Promise<string | null> {
  // 1) נסיון ראשון: PriceFull ברוט
  const rootFiles = await listDir(client, csrftoken, '/', 'PriceFull');
  const rootPriceFull = rootFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '' }))
    .filter(f => /PriceFull.*\.(gz|xml)/i.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  if (rootPriceFull.length > 0) return rootPriceFull[0].name;

  // 2) Fallback: חלק מהרשתות מפרסמות בתת-תיקיות (למשל /2025-04-24).
  // נאתר תיקיות שנראות כמו תאריך ונחפש בהן את ה-PriceFull החדש ביותר.
  const allFiles = await listDir(client, csrftoken, '/', '');
  const subDirs = allFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '', type: f.type }))
    .filter(f => f.type === 'd' && /^\d{4}-\d{2}-\d{2}|^\d{8}/.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  for (const dir of subDirs.slice(0, 3)) { // מנסה רק 3 התיקיות האחרונות
    const subFiles = await listDir(client, csrftoken, `/${dir.name}`, 'PriceFull');
    const matches = subFiles
      .map(f => ({ name: f.fname || f.name || f.DT_RowId || '' }))
      .filter(f => /PriceFull.*\.(gz|xml)/i.test(f.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    if (matches.length > 0) return `${dir.name}/${matches[0].name}`;
  }

  return null;
}

async function downloadFile(client: AxiosInstance, filename: string): Promise<Buffer> {
  const res = await client.get(`/file/d/${filename}`, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

function parseXmlBuffer(buf: Buffer, filename: string): ChainPriceItem[] {
  let xml: string;
  if (filename.endsWith('.gz')) {
    xml = gunzipSync(buf).toString('utf-8');
  } else {
    xml = buf.toString('utf-8');
  }

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
    results.push({
      barcode,
      itemName,
      price,
      unitOfMeasure: it.UnitOfMeasure ? String(it.UnitOfMeasure) : undefined,
      manufacturerName: it.ManufacturerName ? String(it.ManufacturerName) : undefined,
      quantity: it.Quantity ? parseFloat(String(it.Quantity)) : undefined,
      storeId: it.StoreId ? String(it.StoreId) : undefined,
    });
  }
  return results;
}

// פרסור של קובץ Stores*.xml בפורמטים השונים שהרשתות מפרסמות.
// שדות נפוצים: STORE/Store, CHAINID, STOREID, STORENAME, ADDRESS, CITY, ZIPCODE.
// lat/lng לעתים מופיעים בשדות Latitude/Longitude (בחלק קטן מהרשתות).
function parseStoresXml(buf: Buffer, filename: string): ChainStoreItem[] {
  let xml: string;
  if (filename.endsWith('.gz')) {
    xml = gunzipSync(buf).toString('utf-8');
  } else {
    xml = buf.toString('utf-8');
  }

  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
  });
  const parsed = parser.parse(xml) as Record<string, unknown>;

  // ה-root יכול להיות Root / root / asx:abap / ASX:ABAP. נחפש בכולם.
  const pickAny = (obj: unknown, keys: string[]): unknown => {
    if (!obj || typeof obj !== 'object') return undefined;
    const rec = obj as Record<string, unknown>;
    for (const k of keys) {
      if (rec[k] !== undefined) return rec[k];
      const lower = Object.keys(rec).find(x => x.toLowerCase() === k.toLowerCase());
      if (lower) return rec[lower];
    }
    return undefined;
  };

  const root = pickAny(parsed, ['Root', 'root', 'asx:abap', 'OrderXml', 'XmlDoc']);
  const storesContainer = pickAny(root, ['SubChains', 'Stores', 'STORES']);
  // חלק מהרשתות ממש משתמשות ב-SubChains → SubChain → Stores → Store
  const stores = pickAny(storesContainer, ['SubChain', 'Stores', 'Store', 'STORE'])
    ?? pickAny(root, ['Stores', 'STORES', 'Store', 'STORE']);

  // נרד עד שמגיעים לרמת ה-Store. אם מצאנו רשימה נפוצה של Store
  const collectStores = (node: unknown): unknown[] => {
    if (!node) return [];
    if (Array.isArray(node)) return node.flatMap(collectStores);
    if (typeof node !== 'object') return [];
    const rec = node as Record<string, unknown>;
    // נחפש Store / STORE בתת-צמתים
    const keys = Object.keys(rec);
    const storeKey = keys.find(k => k.toLowerCase() === 'store');
    if (storeKey) {
      const v = rec[storeKey];
      return Array.isArray(v) ? v : [v];
    }
    // אם יש Stores/STORES - נרד לתוכו
    const storesKey = keys.find(k => k.toLowerCase() === 'stores');
    if (storesKey) return collectStores(rec[storesKey]);
    // אם מבנה יחיד (רשומה של סניף בודד עם שדות StoreId)
    if ('StoreId' in rec || 'STOREID' in rec || 'storeId' in rec) return [rec];
    return [];
  };

  const storeNodes = collectStores(stores);

  const pick = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const k of keys) {
      const lower = Object.keys(obj).find(x => x.toLowerCase() === k.toLowerCase());
      if (lower && obj[lower] !== undefined && obj[lower] !== null && obj[lower] !== '') {
        return String(obj[lower]).trim();
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
    const storeId = pick(rec, ['StoreId', 'STOREID', 'storeId']);
    const storeName = pick(rec, ['StoreName', 'STORENAME', 'storeName', 'SubChainName']);
    if (!storeId || !storeName) continue;
    const lat = toNum(pick(rec, ['Latitude', 'LATITUDE', 'lat']));
    const lng = toNum(pick(rec, ['Longitude', 'LONGITUDE', 'lng', 'lon']));
    // סינון ערכים לא הגיוניים (חלק מהפורטלים ממלאים 0/0)
    const validCoords = lat !== undefined && lng !== undefined
      && lat >= 29 && lat <= 34 && lng >= 33 && lng <= 36;
    results.push({
      storeId,
      storeName,
      address: pick(rec, ['Address', 'ADDRESS']),
      city: pick(rec, ['City', 'CITY']),
      zipCode: pick(rec, ['ZipCode', 'ZIPCODE', 'zip']),
      lat: validCoords ? lat : undefined,
      lng: validCoords ? lng : undefined,
    });
  }
  return results;
}

// מזהה שגיאות רשת שניתן לנסות שוב עליהן (DNS, timeout, reset).
// שגיאות 4xx/5xx או parse errors - לא מנסים שוב.
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message || '';
  const code = (err as { code?: string }).code || '';
  return /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|getaddrinfo|socket hang up|network/i.test(msg)
    || /ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED/.test(code);
}

// עוטף פונקציה ב-retry עם backoff exponential.
// משמש לקריאות שרת שעשויות ליפול על DNS זמני.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || i === attempts - 1) throw err;
      // backoff: 1.5s, 3s, 6s...
      const delay = 1500 * Math.pow(2, i);
      await new Promise<void>(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export function createPublishedPricesAdapter(options: PublishedPricesOptions): ChainAdapter {
  const { chainId, chainName, username, password = '' } = options;

  return {
    chainId,
    chainName,
    async fetchLatestPrices(): Promise<ChainFetchResult> {
      try {
        return await withRetry(async () => {
          const { client, csrftoken } = await createAuthenticatedClient(username, password);
          const filename = await listLatestPriceFullFile(client, csrftoken);
          if (!filename) {
            return { chainId, chainName, items: [], fetchedFiles: 0, error: 'no_price_file_found' };
          }
          const buf = await downloadFile(client, filename);
          const items = parseXmlBuffer(buf, filename);
          return { chainId, chainName, items, fetchedFiles: 1 };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown_error';
        return { chainId, chainName, items: [], fetchedFiles: 0, error: msg };
      }
    },
    async fetchLatestStores(): Promise<ChainStoresFetchResult> {
      try {
        return await withRetry(async () => {
          const { client, csrftoken } = await createAuthenticatedClient(username, password);
          const filename = await listLatestMatchingFile(
            client,
            csrftoken,
            'Stores',
            /Stores(Full)?.*\.(gz|xml)/i
          );
          if (!filename) {
            return { chainId, chainName, stores: [], fetchedFiles: 0, error: 'no_stores_file_found' };
          }
          const buf = await downloadFile(client, filename);
          const stores = parseStoresXml(buf, filename);
          return { chainId, chainName, stores, fetchedFiles: 1 };
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown_error';
        return { chainId, chainName, stores: [], fetchedFiles: 0, error: msg };
      }
    },
  };
}
