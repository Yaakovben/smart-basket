/**
 * שורות המחיר של כל הסניפים ברשת, בזיכרון צפוף.
 *
 * כל קובץ סניף מפרסם את כל פרטי המוצר מחדש, ובסנכרון של רמי לוי (כמיליון שורות) או
 * קרפור (1.2 מיליון) השורות כאובייקטים תפסו יותר מ-300MB. בשרת עם 512MB הסנכרון נפל
 * על חוסר זיכרון (30.9.2026), והפיל איתו גם את השרת ללקוחות.
 *
 * כאן פרטי המוצר (שם, יצרן, יחידות, ארץ ייצור) נשמרים פעם אחת לכל ברקוד, ומה שמשתנה
 * בין סניפים נשמר בעמודות מספריות: מוצר, סניף, מחיר, מחיר ליחידה, תאריך עדכון ודגלים,
 * כ-27 בתים לשורה. במעבר על השורות כל שורה מורכבת לאובייקט זמני שיורש את פרטי המוצר
 * (prototype), ולכן הקוד שקורא אותן לא משתנה. אסור לפרק שורה (spread) או לעבור על
 * המפתחות שלה, כי פרטי המוצר נמצאים ב-prototype.
 *
 * וגם: מחרוזת שהמפענח חותך מתוך טקסט הקובץ עלולה להחזיק בזיכרון את כל טקסט הקובץ
 * (כ-30MB) כל עוד היא קיימת. לכן כל מחרוזת שנשמרת מועתקת לעותק עצמאי.
 */
import type { ChainPriceItem } from './types';

// עותק עצמאי של מחרוזת, שלא מחזיק את הטקסט שממנו נחתכה
export const flat = (s: string): string => Buffer.from(s, 'utf8').toString('utf8');

// דגלים בעמודת הדגלים
const BLOCKED_TRUE = 1;
const BLOCKED_FALSE = 2;
const NO_STORE = 4;

export class PriceRows implements Iterable<ChainPriceItem> {
  length = 0;
  private products: ChainPriceItem[] = [];
  private productIndex = new Map<string, number>();
  // ערכים שחוזרים (מזהה סניף, תאריך עדכון): מקום 0 שמור ל"אין ערך"
  private values: Array<string | undefined> = [undefined];
  private valueIndex = new Map<string, number>();
  private product = new Uint32Array(1 << 16);
  private store = new Uint32Array(1 << 16);
  private date = new Uint32Array(1 << 16);
  private price = new Float64Array(1 << 16);
  private unitPrice = new Float64Array(1 << 16);
  private flags = new Uint8Array(1 << 16);

  private valueId(s: string | undefined): number {
    if (s === undefined) return 0;
    const hit = this.valueIndex.get(s);
    if (hit !== undefined) return hit;
    const copy = flat(s);
    this.values.push(copy);
    this.valueIndex.set(copy, this.values.length - 1);
    return this.values.length - 1;
  }

  private grow(): void {
    const size = this.product.length * 2;
    const g = <T extends Uint32Array | Float64Array | Uint8Array>(a: T): T => {
      const b = new (a.constructor as new (n: number) => T)(size);
      b.set(a);
      return b;
    };
    this.product = g(this.product);
    this.store = g(this.store);
    this.date = g(this.date);
    this.price = g(this.price);
    this.unitPrice = g(this.unitPrice);
    this.flags = g(this.flags);
  }

  // שורות של קובץ אחד
  add(items: Iterable<ChainPriceItem>): void {
    for (const it of items) {
      let p = this.productIndex.get(it.barcode);
      if (p === undefined) {
        // פרטי המוצר מהשורה הראשונה שלו, כעותקים עצמאיים
        const rec: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(it)) rec[k] = typeof v === 'string' ? flat(v) : v;
        this.products.push(rec as unknown as ChainPriceItem);
        p = this.products.length - 1;
        this.productIndex.set((rec as unknown as ChainPriceItem).barcode, p);
      }
      if (this.length === this.product.length) this.grow();
      const i = this.length++;
      this.product[i] = p;
      this.store[i] = this.valueId(it.storeId);
      this.date[i] = this.valueId(it.itemPriceUpdateDate);
      this.price[i] = it.price;
      this.unitPrice[i] = it.unitOfMeasurePrice ?? Number.NaN;
      this.flags[i] = (it.blockedItem === true ? BLOCKED_TRUE : it.blockedItem === false ? BLOCKED_FALSE : 0)
        | (it.storeId === undefined ? NO_STORE : 0);
    }
  }

  // שורה אחת כאובייקט זמני. כל מה שמשתנה בין סניפים נכתב תמיד, כדי שלא יירש בטעות
  // את הערך של השורה הראשונה של המוצר
  at(i: number): ChainPriceItem {
    const row = Object.create(this.products[this.product[i]]) as ChainPriceItem;
    const f = this.flags[i];
    row.storeId = f & NO_STORE ? undefined : this.values[this.store[i]];
    row.price = this.price[i];
    row.itemPriceUpdateDate = this.values[this.date[i]];
    row.unitOfMeasurePrice = Number.isNaN(this.unitPrice[i]) ? undefined : this.unitPrice[i];
    row.blockedItem = f & BLOCKED_TRUE ? true : f & BLOCKED_FALSE ? false : undefined;
    return row;
  }

  *[Symbol.iterator](): Iterator<ChainPriceItem> {
    for (let i = 0; i < this.length; i++) yield this.at(i);
  }
}
