/**
 * צבירת מבצעים מכל קובצי ה-PromoFull של רשת לרשומות לשמירה.
 *
 * אותו מבצע מופיע בקובץ של כל סניף, אבל כל סניף מפרט רק את הפריטים שהוא מחזיק
 * (ולפעמים במחיר אחר). מדידה על שופרסל (429 סניפים, 28.9.2026): 16,434 מבצעים,
 * 83,681 פריטי מבצע ייחודיים (מבצע x ברקוד x כמות x מחיר), אבל 1.4 מיליון זוגות
 * (פריט, סניף). שמירה לפי "גרסת מבצע שלמה" הכפילה את הפריטים ל-554 אלף.
 *
 * לכן: מסמך אחד לכל מבצע, ובכל פריט מפת ביטים של הסניפים שבהם הוא תקף, לפי סדר
 * הסניפים של הסנכרון (ChainPriceCoverage.promoStoreIds). פריט שתקף בכל הסניפים
 * שסונכרנו נשמר בלי מפה. 429 סניפים = 72 תווי base64 לפריט.
 *
 * לוגיקה טהורה (בלי DB) כדי שאפשר לבדוק אותה.
 */

import { createHash } from 'crypto';
import { normStoreId } from './storeId';
import type { ParsedPromoFile, ParsedPromotion } from '../chains/promoXmlParser';

export interface PromoItem {
  barcode: string;
  // כמות מינימלית לקבלת המחיר (למוצר שקיל: משקל בק"ג)
  minQty: number;
  // מחיר כולל עבור minQty יחידות
  price: number;
  // מפת ביטים (base64) של הסניפים שבהם הפריט תקף. חסר = כל הסניפים שסונכרנו
  stores?: string;
}

export interface AggregatedPromotion {
  promotionId: string;
  // מזהה המבצע + תקציר הפרטים הכלליים. ייחודי בתוך הרשת
  variantKey: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  // מבצע למועדון לקוחות בלבד
  clubOnly: boolean;
  // סכום קנייה מינימלי בחשבונית, אם יש
  minPurchaseAmount?: number;
  items: PromoItem[];
}

export type PromoSkipReason =
  | 'expired'
  | 'coupon'
  | 'bundle'
  | 'no_priced_items'
  | 'too_many_items';

// מבצע עם יותר פריטים מזה הוא בד"כ הנחה כללית ("10% על המחלקה") ולא מחיר מבצע.
// גם הגנה על גודל מסמך במונגו.
export const MAX_ITEMS_PER_PROMOTION = 2_000;

// תקציב פריטי מבצע לרשת. פריט הוא כ-130 בתים עם מפת הסניפים והאינדקס (ברשת של
// 429 סניפים), כך ש-100 אלף פריטים הם כ-13MB. שופרסל, הגדולה ביותר, נמדדה ב-84 אלף.
export const MAX_PROMO_ITEMS_PER_CHAIN = 100_000;

const cents = (p: number): number => Math.round(p * 100);

// ===== מפת ביטים של סניפים =====

export function encodeStoreBitmap(indices: Iterable<number>, totalStores: number): string {
  const bytes = new Uint8Array(Math.max(1, Math.ceil(totalStores / 8)));
  for (const i of indices) bytes[i >> 3] |= 1 << (i & 7);
  return Buffer.from(bytes).toString('base64');
}

export function bitmapHas(bitmap: string, index: number): boolean {
  const bytes = Buffer.from(bitmap, 'base64');
  const byte = index >> 3;
  return byte < bytes.length && (bytes[byte] & (1 << (index & 7))) !== 0;
}

export function bitmapCount(bitmap: string): number {
  let n = 0;
  for (let b of Buffer.from(bitmap, 'base64')) {
    while (b) { n += b & 1; b >>= 1; }
  }
  return n;
}

// קבוצת סניפים כמפת ביטים: ביט לכל סניף. Set של מספרים עלה כ-10KB לפריט מבצע
// שתקף ב-429 סניפי שופרסל, ובעשרות אלפי פריטים הסנכרון נפל על חוסר זיכרון
// (30.9.2026). כאן כ-54 בתים לפריט.
export class StoreSet implements Iterable<number> {
  private bytes = new Uint8Array(8);
  size = 0;

  constructor(first?: number) {
    if (first !== undefined) this.add(first);
  }

  add(index: number): void {
    const byte = index >> 3;
    if (byte >= this.bytes.length) {
      const grown = new Uint8Array(Math.max(byte + 1, this.bytes.length * 2));
      grown.set(this.bytes);
      this.bytes = grown;
    }
    const bit = 1 << (index & 7);
    if (!(this.bytes[byte] & bit)) {
      this.bytes[byte] |= bit;
      this.size++;
    }
  }

  *[Symbol.iterator](): Iterator<number> {
    for (let byte = 0; byte < this.bytes.length; byte++) {
      const b = this.bytes[byte];
      if (!b) continue;
      for (let bit = 0; bit < 8; bit++) if (b & (1 << bit)) yield byte * 8 + bit;
    }
  }
}

// ===== צבירה =====

// פריט מבצע שאפשר לחשב ממנו מחיר: יש מחיר כולל חיובי וכמות חיובית.
// פריט עם אחוז הנחה בלבד לא נשמר: אי אפשר לדעת ממנו מחיר בלי לנחש על מה חל האחוז.
function toPromoItem(it: { barcode: string; minQty?: number; discountedPrice?: number; isGift?: boolean }): Omit<PromoItem, 'stores'> | null {
  if (it.isGift) return null;
  if (!it.barcode) return null;
  const price = it.discountedPrice;
  if (price === undefined || !(price > 0) || price > 10_000) return null;
  const minQty = it.minQty !== undefined && it.minQty > 0 ? it.minQty : 1;
  return { barcode: it.barcode, minQty, price: cents(price) / 100 };
}

type PromoMeta = Omit<AggregatedPromotion, 'items'>;

function variantKeyOf(p: Omit<PromoMeta, 'variantKey'>): string {
  const h = createHash('sha1');
  h.update([
    p.promotionId, p.description, p.startDate?.getTime() ?? '', p.endDate?.getTime() ?? '',
    p.clubOnly ? 1 : 0, p.minPurchaseAmount ?? '',
  ].join('|'));
  return `${p.promotionId}:${h.digest('hex').slice(0, 12)}`;
}

export interface PromoAccumulatorStats {
  filesProcessed: number;
  promotionsSeen: number;
  itemsWithoutBarcode: number;
  skipped: Record<PromoSkipReason, number>;
}

interface PromoEntry {
  meta: PromoMeta;
  // מפתח פריט (ברקוד:כמות:מחיר) -> הפריט ואינדקסי הסניפים שבהם הוא תקף
  items: Map<string, { item: Omit<PromoItem, 'stores'>; stores: StoreSet }>;
}

export class PromoAccumulator {
  private readonly promos = new Map<string, PromoEntry>();
  // מזהה סניף מנורמל -> אינדקס במפת הביטים, לפי סדר ההופעה
  private readonly storeIndex = new Map<string, number>();
  readonly stats: PromoAccumulatorStats = {
    filesProcessed: 0,
    promotionsSeen: 0,
    itemsWithoutBarcode: 0,
    skipped: { expired: 0, coupon: 0, bundle: 0, no_priced_items: 0, too_many_items: 0 },
  };

  constructor(private readonly now: Date = new Date()) {}

  // נקרא לכל קובץ סניף. fallbackStoreId = המזהה משם הקובץ, אם אין בתוכו
  addFile(file: ParsedPromoFile, fallbackStoreId?: string): void {
    const rawStoreId = file.storeId ?? fallbackStoreId;
    if (!rawStoreId) return;
    const storeId = normStoreId(rawStoreId);
    let idx = this.storeIndex.get(storeId);
    if (idx === undefined) {
      idx = this.storeIndex.size;
      this.storeIndex.set(storeId, idx);
    }
    this.stats.filesProcessed++;
    this.stats.itemsWithoutBarcode += file.itemsWithoutBarcode;
    for (const p of file.promotions) this.addPromotion(p, idx);
  }

  private skip(reason: PromoSkipReason): void {
    this.stats.skipped[reason]++;
  }

  private addPromotion(p: ParsedPromotion, storeIdx: number): void {
    this.stats.promotionsSeen++;
    if (p.endDate && p.endDate.getTime() < this.now.getTime()) return this.skip('expired');
    // קופון דורש פעולה מצד הלקוח, זה לא מחיר מדף
    if (p.isCoupon) return this.skip('coupon');
    // כמה קבוצות = חבילה ("סט לולב: פריט מקבוצה 1 + פריט מקבוצה 2"). מחיר הפריט
    // תקף רק בקניית החבילה כולה, ולכן לא מתאים להשוואת מחיר מוצר.
    if (p.groups.length > 1) return this.skip('bundle');
    const group = p.groups[0];
    if (!group) return this.skip('no_priced_items');
    if (group.items.length > MAX_ITEMS_PER_PROMOTION) return this.skip('too_many_items');

    const items = group.items.map(toPromoItem).filter((i): i is Omit<PromoItem, 'stores'> => i !== null);
    if (items.length === 0) return this.skip('no_priced_items');

    const base = {
      promotionId: p.promotionId,
      description: p.description,
      startDate: p.startDate,
      endDate: p.endDate,
      clubOnly: p.clubIds.some(id => id !== 0),
      minPurchaseAmount: group.minPurchaseAmount,
    };
    const variantKey = variantKeyOf(base);
    let entry = this.promos.get(variantKey);
    if (!entry) {
      entry = { meta: { ...base, variantKey }, items: new Map() };
      this.promos.set(variantKey, entry);
    }
    for (const item of items) {
      const key = `${item.barcode}:${item.minQty}:${item.price}`;
      const existing = entry.items.get(key);
      if (existing) existing.stores.add(storeIdx);
      else entry.items.set(key, { item, stores: new StoreSet(storeIdx) });
    }
  }

  // מזהי הסניפים שעובדו, בסדר של מפות הביטים. רק עליהם אפשר להסיק "אין מבצע".
  get storeIds(): string[] {
    return [...this.storeIndex.keys()];
  }

  /**
   * knownBarcodes: ברקודים שיש להם מחיר ברשת. פריט מבצע בלי מחיר רגיל (קוד פנימי,
   * מוצר שאזל) לא ניתן להשוואה ורק תופס מקום. בלי הפרמטר - לא מסננים.
   * מחזיר גם כמה פריטים נחתכו בגלל התקציב.
   */
  finish(knownBarcodes?: Set<string>): { promotions: AggregatedPromotion[]; itemsOverBudget: number } {
    const totalStores = this.storeIndex.size;
    const result: Array<AggregatedPromotion & { reach: number }> = [];
    for (const { meta, items } of this.promos.values()) {
      let reach = 0;
      const out: PromoItem[] = [];
      for (const { item, stores } of items.values()) {
        if (knownBarcodes && !knownBarcodes.has(item.barcode)) continue;
        reach = Math.max(reach, stores.size);
        out.push(stores.size === totalStores ? { ...item } : { ...item, stores: encodeStoreBitmap(stores, totalStores) });
      }
      if (out.length === 0) continue;
      out.sort((a, b) => a.barcode.localeCompare(b.barcode) || a.minQty - b.minQty || a.price - b.price);
      result.push({ ...meta, items: out, reach });
    }

    // מעל התקציב: עדיפות למבצעים לכלל הלקוחות, בלי מינימום קנייה, ממוקדים (מעט
    // פריטים) ושתקפים בהרבה סניפים. מה שנחתך נספר ללוג.
    result.sort((a, b) =>
      Number(a.clubOnly) - Number(b.clubOnly)
      || Number(!!a.minPurchaseAmount) - Number(!!b.minPurchaseAmount)
      || a.items.length - b.items.length
      || b.reach - a.reach);
    let budget = MAX_PROMO_ITEMS_PER_CHAIN;
    let itemsOverBudget = 0;
    const kept: AggregatedPromotion[] = [];
    for (const { reach: _reach, ...p } of result) {
      if (p.items.length <= budget) {
        kept.push(p);
        budget -= p.items.length;
      } else {
        itemsOverBudget += p.items.length;
      }
    }
    return { promotions: kept, itemsOverBudget };
  }
}

// מחיר ליחידה במבצע, לתצוגה
// מחיר ליחידה במבצע. כמות מתחת ל-1 היא מוצר שקיל (למשל 0.01 ק"ג), והמחיר שבקובץ כבר
// לק"ג: חלוקה בכמות נתנה "5,900 ש"ח ליחידה" לשוקולד במשקל
export const promoUnitPrice = (item: Pick<PromoItem, 'minQty' | 'price'>): number =>
  item.minQty < 1 ? item.price : cents(item.price / item.minQty) / 100;

// אינדקס הסניף במפות הביטים, מתוך סדר הסניפים של הסנכרון. undefined = אין מידע מבצעים לסניף
export function promoStoreIndex(storeId: string, promoStoreIds: string[]): number | undefined {
  const i = promoStoreIds.indexOf(normStoreId(storeId));
  return i === -1 ? undefined : i;
}

// האם פריט מבצע תקף בסניף (לפי האינדקס של הסניף בסנכרון)
export function promoItemAppliesToStore(item: Pick<PromoItem, 'stores'>, storeIdx: number | undefined): boolean {
  if (storeIdx === undefined) return false;
  return item.stores === undefined || bitmapHas(item.stores, storeIdx);
}

// האם המבצע פעיל ברגע נתון
export function promotionIsActive(promo: Pick<AggregatedPromotion, 'startDate' | 'endDate'>, at: Date): boolean {
  const t = at.getTime();
  if (promo.startDate && promo.startDate.getTime() > t) return false;
  if (promo.endDate && promo.endDate.getTime() < t) return false;
  return true;
}
