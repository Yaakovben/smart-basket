/**
 * portalXmlParser.ts
 *
 * פענוח קבצי XML (מחירים/סניפים) שמפרסמות הרשתות בפורטל publishedprices.
 * כולל decompression (gzip או zip לפי מאגיק-בייטס) ופרסור סובלני לפורמטים
 * השונים שרשתות שונות משתמשות בהם (PascalCase/camelCase, מבנים מקוננים).
 */

import { XMLParser } from 'fast-xml-parser';
import { gunzipSync } from 'zlib';
import AdmZip from 'adm-zip';
import type { ChainPriceItem, ChainStoreItem } from './types';

// פורטל Bina מתייג קבצים בסיומת .gz אך הם בעצם ZIP (חתימה PK).
// פורטל publishedprices מספק קבצי gzip אמיתיים. הפונקציה מזהה את הפורמט
// לפי מאגיק-בייטס ופותחת בהתאם.
function decompressBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf).toString('utf-8');
  }
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
    const zip = new AdmZip(buf);
    const entries = zip.getEntries();
    if (entries.length === 0) throw new Error('zip_empty');
    return entries[0].getData().toString('utf-8');
  }
  return buf.toString('utf-8');
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

export function parseXmlBuffer(buf: Buffer, _filename: string): ChainPriceItem[] {
  const xml = decompressBuffer(buf);

  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    maxNestedTags: 1000,
  });
  const parsed = parser.parse(xml) as PriceFullXml;
  const itemsNode = parsed.Root?.Items?.Item || parsed.root?.Items?.Item;
  if (!itemsNode) return [];
  const arr = Array.isArray(itemsNode) ? itemsNode : [itemsNode];

  const results: ChainPriceItem[] = [];
  for (const it of arr) {
    const itAnyEarly = it as Record<string, unknown>;
    const barcode = String(it.ItemCode || itAnyEarly.itemCode || '').trim();
    const price = parseFloat(String(it.ItemPrice || itAnyEarly.itemPrice || '0'));
    // Bina משתמש ב-ItemNm במקום ItemName - תומכים בשני הפורמטים.
    const itemName = String(it.ItemName || itAnyEarly.ItemNm || itAnyEarly.itemName || itAnyEarly.itemNm || '').trim();
    if (!barcode || !itemName || isNaN(price) || price <= 0) continue;
    // מחלץ ערכים בצורה גמישה - שמות שדות יכולים להיות ב-PascalCase או camelCase
    const itAny = it as Record<string, unknown>;
    const get = (...keys: string[]): string | undefined => {
      for (const k of keys) {
        const v = itAny[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
      return undefined;
    };
    const getNum = (...keys: string[]): number | undefined => {
      const v = get(...keys);
      if (v === undefined) return undefined;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const isWeightedRaw = get('bIsWeighted', 'BIsWeighted', 'IsWeighted', 'isWeighted');
    const allowDiscountRaw = get('AllowDiscount', 'allowDiscount');
    const blockedRaw = get('BlockedItem', 'blockedItem', 'StatusBlock');
    results.push({
      barcode,
      itemName,
      price,
      unitOfMeasure: get('UnitOfMeasure', 'unitOfMeasure'),
      manufacturerName: get('ManufacturerName', 'manufacturerName'),
      quantity: getNum('Quantity', 'quantity'),
      storeId: get('StoreId', 'storeId'),
      manufactureCountry: get('ManufactureCountry', 'manufactureCountry'),
      manufacturerItemDescription: get('ManufacturerItemDescription', 'manufacturerItemDescription'),
      qtyInPackage: getNum('QtyInPackage', 'qtyInPackage'),
      isWeighted: isWeightedRaw !== undefined ? (isWeightedRaw === '1' || isWeightedRaw.toLowerCase() === 'true') : undefined,
      unitQty: get('UnitQty', 'unitQty'),
      itemPriceUpdateDate: get('PriceUpdateDate', 'priceUpdateDate'),
      itemType: getNum('ItemType', 'itemType'),
      itemId: get('ItemId', 'itemId'),
      allowDiscount: allowDiscountRaw !== undefined ? (allowDiscountRaw === '1' || allowDiscountRaw.toLowerCase() === 'true') : undefined,
      blockedItem: blockedRaw !== undefined ? (blockedRaw === '1' || blockedRaw.toLowerCase() === 'true') : undefined,
      itemStatus: get('ItemStatus', 'itemStatus'),
      bikoretNo: get('BikoretNo', 'bikoretNo'),
      unitOfMeasurePrice: getNum('UnitOfMeasurePrice', 'unitOfMeasurePrice'),
    });
  }
  return results;
}

// פרסור של קובץ Stores*.xml בפורמטים השונים שהרשתות מפרסמות.
// שדות נפוצים: STORE/Store, CHAINID, STOREID, STORENAME, ADDRESS, CITY, ZIPCODE.
// lat/lng לעתים מופיעים בשדות Latitude/Longitude (בחלק קטן מהרשתות).
export function parseStoresXml(buf: Buffer, _filename: string): ChainStoreItem[] {
  const xml = decompressBuffer(buf);

  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    maxNestedTags: 1000,
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

  // מזהה אם רשומה "מריחה" כמו פריט מחיר ולא סניף (StoreId מופיע גם בקובצי מחיר,
  // ולכן חייבים לוודא שאין שדות זיהוי של פריט: ItemCode / ItemName / ItemPrice).
  const isPriceItem = (rec: Record<string, unknown>): boolean => {
    const keys = Object.keys(rec).map(k => k.toLowerCase());
    return keys.some(k => k === 'itemcode' || k === 'itemname' || k === 'itemprice');
  };

  // נרד עד שמגיעים לרמת ה-Store. לא רוצים להחזיר רשומות שנראות כמו price items.
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
    // אם מבנה יחיד (רשומה של סניף בודד) - חייב לא להיראות כמו פריט מחיר
    if (('StoreId' in rec || 'STOREID' in rec || 'storeId' in rec) && !isPriceItem(rec)) {
      return [rec];
    }
    return [];
  };

  let storeNodes = collectStores(stores);

  // שומר נוסף: סניף תקין חייב גם StoreName, וגם אסור שיהיה ItemCode/ItemName
  storeNodes = storeNodes.filter(node => {
    if (!node || typeof node !== 'object') return false;
    const rec = node as Record<string, unknown>;
    if (isPriceItem(rec)) return false;
    const hasName = Object.keys(rec).some(k =>
      ['storename', 'STORENAME'.toLowerCase()].includes(k.toLowerCase())
    );
    return hasName;
  });

  // ישראל כולה ~1,500 סניפי שופרסמרקט. אם קיבלנו יותר - הפרסר בטח נפל
  // על קובץ מחירים בטעות, זרוק הכל כדי למנוע זבל במונגו.
  if (storeNodes.length > 3000) {
    return [];
  }

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
      // תת-רשת (AM:PM, פרש מרקט, היפר וכו') וסוג סניף - מטא-דאטה לתצוגה
      subChainId: pick(rec, ['SubChainId', 'SUBCHAINID', 'subChainId', 'SubChainID']),
      subChainName: pick(rec, ['SubChainName', 'SUBCHAINNAME', 'subChainName']),
      storeType: pick(rec, ['StoreType', 'STORETYPE', 'storeType']),
    });
  }
  return results;
}
