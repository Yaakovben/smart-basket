/**
 * shufersal.adapter.ts
 *
 * שופרסל — פורטל שקיפות עצמאי (prices.shufersal.co.il).
 * הפורטל הזה שונה מ-publishedprices.co.il:
 *  - ללא login
 *  - דף HTML שרושם קבצי XML.gz
 *  - לוחצים על הקישור, מוריד gzipped XML
 *
 * מבנה ה-XML זהה (Root/Items/Item) — אפשר להשתמש באותו parser.
 */

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { gunzipSync } from 'zlib';
import type { ChainAdapter, ChainFetchResult, ChainPriceItem } from './types';

const SHUFERSAL_PORTAL = 'https://prices.shufersal.co.il';

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

// מחלצים את קישור ההורדה הראשון מ-PriceFull הזמין בעמוד הקטלוג
// פורטל שופרסל מראה טבלה עם <a href="/FileObject/UpdateCategory?...&FileNm=PriceFull..."> או קישור ישיר
function extractLatestPriceFullUrl(html: string): string | null {
  // תבנית קישור: /FileObject/UpdateCategory?... או href="https://pricesprodpublic.blob.core.windows.net/...PriceFull...gz"
  const matches = [
    ...html.matchAll(/href="([^"]*PriceFull[^"]*\.gz[^"]*)"/gi),
  ];
  if (matches.length === 0) return null;

  // בוחרים את הראשון (הפורטל ממיין לפי תאריך יורד)
  const url = matches[0][1];
  // אם זה path יחסי — מוסיפים את ה-base
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${SHUFERSAL_PORTAL}${url}`;
  return `${SHUFERSAL_PORTAL}/${url}`;
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

export const shufersalAdapter: ChainAdapter = {
  chainId: 'shufersal',
  chainName: 'שופרסל',
  async fetchLatestPrices(): Promise<ChainFetchResult> {
    try {
      // עמוד קטלוג של מחירים (catID=1 — הקטגוריה הנכונה לפורטל שופרסל)
      const listRes = await axios.get<string>(`${SHUFERSAL_PORTAL}/FileObject/UpdateCategory?catID=1&storeId=0`, {
        timeout: 60_000,
        headers: { 'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)' },
      });
      const url = extractLatestPriceFullUrl(listRes.data);
      if (!url) {
        return { chainId: 'shufersal', chainName: 'שופרסל', items: [], fetchedFiles: 0, error: 'no_price_file_found' };
      }

      const fileRes = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 120_000,
        headers: { 'User-Agent': 'Mozilla/5.0 (smart-basket price-sync)' },
      });
      const buf = Buffer.from(fileRes.data);
      const isGzipped = url.toLowerCase().endsWith('.gz');
      const items = parseXmlBuffer(buf, isGzipped);

      return { chainId: 'shufersal', chainName: 'שופרסל', items, fetchedFiles: 1 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown_error';
      return { chainId: 'shufersal', chainName: 'שופרסל', items: [], fetchedFiles: 0, error: msg };
    }
  },
};
