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
import type { ChainAdapter, ChainFetchResult, ChainPriceItem } from './types';
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

export function createPublishedPricesAdapter(options: PublishedPricesOptions): ChainAdapter {
  const { chainId, chainName, username, password = '' } = options;

  return {
    chainId,
    chainName,
    async fetchLatestPrices(): Promise<ChainFetchResult> {
      try {
        const { client, csrftoken } = await createAuthenticatedClient(username, password);
        const filename = await listLatestPriceFullFile(client, csrftoken);
        if (!filename) {
          return { chainId, chainName, items: [], fetchedFiles: 0, error: 'no_price_file_found' };
        }
        const buf = await downloadFile(client, filename);
        const items = parseXmlBuffer(buf, filename);
        return { chainId, chainName, items, fetchedFiles: 1 };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown_error';
        return { chainId, chainName, items: [], fetchedFiles: 0, error: msg };
      }
    },
  };
}
