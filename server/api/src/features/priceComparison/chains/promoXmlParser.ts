/**
 * promoXmlParser.ts
 *
 * פענוח קובצי PromoFull (מבצעים) של הרשתות. יש שני מבנים בפועל, שאומתו מול
 * קבצים אמיתיים שהורדו מהפורטלים:
 *
 * 1. מבנה קבוצות: שופרסל, רמי לוי, אושר עד, יוחננוף, טיב טעם, סטופ מרקט, קרפור,
 *    מעיין 2000, שפע ברכת השם, סופר ספיר, חצי חינם, מחסני השוק.
 *    Promotion > Groups > Group > PromotionItems > PromotionItem, והמחיר (DiscountedPrice)
 *    והכמות (MinQty) נמצאים בכל פריט.
 *
 * 2. מבנה שטוח: קשת טעמים.
 *    Promotion > PromotionItems > Item, והמחיר והכמות ברמת המבצע.
 *
 * DiscountedPrice הוא המחיר הכולל עבור MinQty יחידות: "6 ב 70" מגיע עם MinQty=6
 * ו-DiscountedPrice=70, ו-"2ב10" עם MinQty=2 ו-DiscountedPrice=10.
 *
 * הפענוח לא מסנן לפי עסקיות (פג תוקף, קופון, מועדון). הסינון נעשה בצבירה,
 * ראו services/promoAggregation.ts.
 */

import { XMLParser } from 'fast-xml-parser';
import { decompressBuffer } from './portalXmlParser';

export interface ParsedPromotionItem {
  barcode: string;
  minQty?: number;
  // מחיר כולל עבור minQty יחידות
  discountedPrice?: number;
  discountRate?: number;
  isWeighted?: boolean;
  isGift?: boolean;
}

export interface ParsedPromotionGroup {
  minPurchaseAmount?: number;
  items: ParsedPromotionItem[];
}

export interface ParsedPromotion {
  promotionId: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  updatedAt?: Date;
  // 0 = כלל הלקוחות. כל ערך אחר = מועדון לקוחות
  clubIds: number[];
  isCoupon: boolean;
  groups: ParsedPromotionGroup[];
}

export interface ParsedPromoFile {
  chainCode?: string;
  storeId?: string;
  promotions: ParsedPromotion[];
  // פריטים בלי ברקוד: לא נזרקים בשקט, נספרים ללוג הסנכרון
  itemsWithoutBarcode: number;
}

type Node = Record<string, unknown>;

// תגיות שחוזרות על עצמן. בלי זה fast-xml-parser מחזיר אובייקט בודד כשיש מופע אחד
const ARRAY_TAGS = new Set(['promotion', 'group', 'promotionitem', 'item', 'clubid']);

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  maxNestedTags: 1000,
  isArray: (name: string) => ARRAY_TAGS.has(name.toLowerCase()),
});

// שמות התגיות משתנים בין רשתות באותיות גדולות וקטנות (PromotionID מול PromotionId)
function field(node: unknown, ...keys: string[]): unknown {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined;
  const rec = node as Node;
  for (const key of keys) {
    const lower = key.toLowerCase();
    const found = Object.keys(rec).find(k => k.toLowerCase() === lower);
    if (found !== undefined) return rec[found];
  }
  return undefined;
}

function text(node: unknown, ...keys: string[]): string | undefined {
  let v = field(node, ...keys);
  if (Array.isArray(v)) v = v[0];
  if (v === undefined || v === null || typeof v === 'object') return undefined;
  const s = String(v).trim();
  return s === '' ? undefined : s;
}

function num(node: unknown, ...keys: string[]): number | undefined {
  const s = text(node, ...keys);
  if (s === undefined) return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function flag(node: unknown, ...keys: string[]): boolean | undefined {
  const s = text(node, ...keys);
  if (s === undefined) return undefined;
  return s === '1' || s.toLowerCase() === 'true';
}

function list(node: unknown, ...keys: string[]): unknown[] {
  const v = field(node, ...keys);
  if (v === undefined || v === null || v === '') return [];
  return Array.isArray(v) ? v : [v];
}

// הפרש שעון ישראל מ-UTC בדקות ברגע נתון (שעון קיץ משתנה)
const israelParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jerusalem',
  hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});
function israelOffsetMinutes(utcMs: number): number {
  const p: Record<string, number> = {};
  for (const part of israelParts.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - utcMs) / 60_000);
}

// התאריכים בקבצים הם שעון ישראל בלי אזור זמן: "2026-10-03T23:59:00.000" או
// "2026-10-03" ושעה נפרדת "23:59:00"
export function parseIsraelDateTime(date: string | undefined, time?: string): Date | undefined {
  if (!date) return undefined;
  const d = date.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!d) return undefined;
  let [hh, mm, ss] = [d[4], d[5], d[6]];
  if (hh === undefined && time) {
    const t = time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (t) [hh, mm, ss] = [t[1], t[2], t[3]];
  }
  const guess = Date.UTC(+d[1], +d[2] - 1, +d[3], +(hh ?? 0), +(mm ?? 0), +(ss ?? 0));
  if (!Number.isFinite(guess)) return undefined;
  return new Date(guess - israelOffsetMinutes(guess) * 60_000);
}

// "0 - כלל הלקוחות" / "1 - המועדון החדש" / "0"
function parseClubIds(promo: Node): number[] {
  const raw: unknown[] = [];
  raw.push(...list(promo, 'ClubID', 'ClubId'));
  for (const clubs of list(promo, 'Clubs')) raw.push(...list(clubs, 'ClubId', 'ClubID'));
  const ids = new Set<number>();
  for (const r of raw) {
    const m = String(r ?? '').trim().match(/^-?\d+/);
    if (m) ids.add(Number(m[0]));
  }
  return ids.size > 0 ? [...ids] : [0];
}

function parseGroupedItems(group: unknown): ParsedPromotionItem[] {
  const itemsNode = field(group, 'PromotionItems');
  return list(itemsNode, 'PromotionItem', 'Item').map(it => ({
    barcode: text(it, 'ItemCode') ?? '',
    minQty: num(it, 'MinQty'),
    discountedPrice: num(it, 'DiscountedPrice'),
    discountRate: num(it, 'DiscountRate'),
    isWeighted: flag(it, 'bIsWeighted', 'IsWeighted'),
  }));
}

function parsePromotion(promo: Node): ParsedPromotion {
  const startDate = parseIsraelDateTime(
    text(promo, 'PromotionStartDateTime', 'PromotionStartDate'),
    text(promo, 'PromotionStartHour'),
  );
  const endDate = parseIsraelDateTime(
    text(promo, 'PromotionEndDateTime', 'PromotionEndDate'),
    text(promo, 'PromotionEndHour'),
  );
  const restrictions = field(promo, 'AdditionalRestrictions');
  const isCoupon = flag(promo, 'AdditionalIsCoupon') ?? flag(restrictions, 'AdditionalIsCoupon') ?? false;

  const groupsNode = field(promo, 'Groups');
  let groups: ParsedPromotionGroup[];
  if (groupsNode !== undefined && groupsNode !== '') {
    groups = list(groupsNode, 'Group').map(g => ({
      minPurchaseAmount: num(g, 'MinPurchaseAmount') || undefined,
      items: parseGroupedItems(g),
    }));
  } else {
    // מבנה שטוח: מחיר וכמות ברמת המבצע, חלים על כל הפריטים
    const minQty = num(promo, 'MinQty');
    const discountedPrice = num(promo, 'DiscountedPrice');
    const discountRate = num(promo, 'DiscountRate');
    const isWeighted = flag(promo, 'IsWeightedPromo');
    const items = list(field(promo, 'PromotionItems'), 'Item', 'PromotionItem').map(it => ({
      barcode: text(it, 'ItemCode') ?? '',
      minQty, discountedPrice, discountRate, isWeighted,
      isGift: flag(it, 'IsGiftItem'),
    }));
    groups = [{ minPurchaseAmount: num(promo, 'MinPurchaseAmnt', 'MinPurchaseAmount') || undefined, items }];
  }

  return {
    promotionId: text(promo, 'PromotionID', 'PromotionId') ?? '',
    description: text(promo, 'PromotionDescription') ?? '',
    startDate,
    endDate,
    updatedAt: parseIsraelDateTime(text(promo, 'PromotionUpdateTime', 'PromotionUpdateDate')),
    clubIds: parseClubIds(promo),
    isCoupon,
    groups,
  };
}

export function parsePromoXml(xml: string): ParsedPromoFile {
  const parsed = parser.parse(xml) as Node;
  const root = field(parsed, 'Root') ?? field(parsed, 'asx:abap');
  const promotionsNode = field(root, 'Promotions');
  const promotions: ParsedPromotion[] = [];
  let itemsWithoutBarcode = 0;
  for (const p of list(promotionsNode, 'Promotion')) {
    const promo = parsePromotion(p as Node);
    if (!promo.promotionId) continue;
    for (const g of promo.groups) {
      const before = g.items.length;
      g.items = g.items.filter(it => it.barcode !== '');
      itemsWithoutBarcode += before - g.items.length;
    }
    promotions.push(promo);
  }
  return {
    chainCode: text(root, 'ChainID', 'ChainId'),
    storeId: text(root, 'StoreID', 'StoreId'),
    promotions,
    itemsWithoutBarcode,
  };
}

export function parsePromoBuffer(buf: Buffer): ParsedPromoFile {
  return parsePromoXml(decompressBuffer(buf));
}
