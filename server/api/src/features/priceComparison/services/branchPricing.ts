/**
 * מחירי סניף באחסון חריגות בלבד, בתוך מסמך ה-Price.
 *
 * בפועל רוב המחירים בסניפי רשת זהים למחיר הנפוץ ברשת. לכן שומרים ב-Price של כל
 * (ברקוד, רשת):
 *  1. modalPrice: המחיר הנפוץ, וגם storeCoverage: חלק הסניפים שמוכרים את המוצר.
 *  2. storePrices: רשימת "סניף:מחיר" רק לסניפים שמחירם שונה מהנפוץ.
 *
 * היעדר חריגה למוצר בכיסוי גבוה בסניף מסונכרן = המחיר הנפוץ.
 *
 * למה בתוך המסמך ולא באוסף נפרד: אוסף branch_prices עם שורה לכל (סניף, מוצר)
 * ואינדקס מורכב מילא את מכסת 512MB של Atlas החינמי. מכסת Atlas נמדדת בגודל לוגי
 * (נתונים ואינדקסים, לא דחוס) של כל בסיסי הנתונים באשכול, ולכן שורה לכל
 * (סניף x מוצר) עלתה כ-260 בתים. חריגה בתוך המסמך עולה כ-15 בתים, בלי אינדקס.
 *
 * לוגיקה טהורה (בלי DB) כדי שאפשר לבדוק אותה.
 */

// מוצר שנמכר בלפחות 90% מסניפי הרשת: היעדר שורה בסניף מסונכרן = המחיר הנפוץ.
export const TYPICAL_COVERAGE_THRESHOLD = 0.9;

// תקציב החריגות לרשת. כל חריגה כ-15 בתים בתוך המסמך (בלי אינדקס), כך ש-300 אלף
// חריגות הן כ-4.5MB לרשת, ו-14 רשתות לכל היותר כ-63MB במקרה הקיצוני. רשת שחורגת
// (מחירים שמשתנים מאוד בין סניפים) לא נשמרת ברמת סניף בכלל, ונשארת בהשוואה ברמת
// רשת מסומנת "לא מאומת". חלקי-נתונים היה גרוע יותר: היעדר חריגה למוצר בכיסוי גבוה
// מוסק בטעות כמחיר הנפוץ. הגבלה זו נמדדת בגודל לוגי, לא ב-storageSize הדחוס.
export const MAX_EXCEPTION_ROWS_PER_CHAIN = 300_000;

export const exceedsExceptionBudget = (rowCount: number): boolean => rowCount > MAX_EXCEPTION_ROWS_PER_CHAIN;

export interface FeedItem {
  storeId: string;
  barcode: string;
  price: number;
}

export interface BarcodeStats {
  // המחיר שהכי הרבה סניפים גובים (בשוויון - הנמוך)
  modalPrice: number;
  // בכמה סניפים המוצר נמכר
  storeCount: number;
  // storeCount חלקי מספר הסניפים בפיד (0..1)
  coverage: number;
}

const cents = (p: number): number => Math.round(p * 100);

// סטטיסטיקה לכל ברקוד מתוך פיד הרשת. totalStores = מספר הסניפים השונים בפיד.
export function buildBarcodeStats(items: FeedItem[], totalStores: number): Map<string, BarcodeStats> {
  const acc = new Map<string, { prices: Map<number, number>; stores: Set<string> }>();
  for (const it of items) {
    const entry = acc.get(it.barcode) ?? { prices: new Map<number, number>(), stores: new Set<string>() };
    // סניף שמופיע פעמיים לאותו ברקוד נספר פעם אחת
    if (!entry.stores.has(it.storeId)) {
      entry.stores.add(it.storeId);
      const c = cents(it.price);
      entry.prices.set(c, (entry.prices.get(c) ?? 0) + 1);
    }
    acc.set(it.barcode, entry);
  }

  const result = new Map<string, BarcodeStats>();
  for (const [barcode, { prices, stores }] of acc) {
    let modalCents = -1;
    let modalCount = 0;
    for (const [c, count] of prices) {
      if (count > modalCount || (count === modalCount && c < modalCents)) { modalCents = c; modalCount = count; }
    }
    result.set(barcode, {
      modalPrice: modalCents / 100,
      storeCount: stores.size,
      coverage: totalStores > 0 ? stores.size / totalStores : 0,
    });
  }
  return result;
}

// האם מחיר הסניף שונה מהנפוץ (אז חובה לשמור אותו, אחרת היסק מהמחיר הנפוץ שגוי).
// בלי סטטיסטיקה לברקוד - שומרים, כי אין על מה להסיק.
export function isPriceException(price: number, stats: BarcodeStats | undefined): boolean {
  return !stats || cents(price) !== cents(stats.modalPrice);
}

// קידוד חריגה לשמירה במסמך: "סניף:מחיר". מזהה הסניף מנורמל ואינו מכיל נקודתיים.
export const encodeStorePrice = (storeId: string, price: number): string => `${storeId}:${cents(price) / 100}`;

// פענוח storePrices ממסמך Price למפה סניף -> מחיר. ערכים פגומים מדולגים.
export function parseStorePrices(entries: string[] | undefined): Map<string, number> {
  const result = new Map<string, number>();
  for (const e of entries ?? []) {
    const i = e.lastIndexOf(':');
    if (i <= 0) continue;
    const price = Number(e.slice(i + 1));
    if (Number.isFinite(price) && price > 0) result.set(e.slice(0, i), price);
  }
  return result;
}

export interface ResolvedBranchPrice {
  price: number;
  // true = המחיר אומת לסניף (שורה מפורשת, או היסק בטוח מהמחיר הנפוץ)
  verified: boolean;
  // true = המחיר הוסק מהמחיר הנפוץ ולא נשמר במפורש לסניף
  inferred: boolean;
}

// מחיר מוצר בסניף מתוך מה ששמור. chainMin = המחיר הזול ברשת, הגיבוי האחרון.
export function resolveBranchPrice(input: {
  explicit?: number;
  modalPrice?: number;
  coverage?: number;
  // האם הסניף סונכרן (הופיע בפיד האחרון). בלי זה אי אפשר להסיק כלום עליו.
  storeHasPrices: boolean;
  chainMin: number;
}): ResolvedBranchPrice {
  if (typeof input.explicit === 'number') return { price: input.explicit, verified: true, inferred: false };
  if (
    input.storeHasPrices &&
    typeof input.modalPrice === 'number' &&
    typeof input.coverage === 'number' &&
    input.coverage >= TYPICAL_COVERAGE_THRESHOLD
  ) {
    return { price: input.modalPrice, verified: true, inferred: true };
  }
  return { price: input.modalPrice ?? input.chainMin, verified: false, inferred: false };
}
