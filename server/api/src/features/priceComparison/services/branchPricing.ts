/**
 * מחירי סניף באחסון חריגות בלבד.
 *
 * בפועל 89%-95% מהמחירים בסניפי רשת זהים למחיר הנפוץ ברשת. במקום לשמור שורה
 * לכל (סניף × מוצר) - מאות אלפי שורות לרשת ואשכול חינמי של 512MB - שומרים:
 *  1. ב-Price: המחיר הנפוץ (modalPrice) וכיסוי הסניפים של המוצר (storeCoverage).
 *  2. ב-branch_prices: שורה רק לסניף שמחירו שונה מהנפוץ, או למוצר שנמכר בחלק
 *     קטן מהסניפים (כיסוי נמוך) - שם היעדר שורה לא מעיד על "אותו מחיר".
 *
 * היעדר שורה למוצר בכיסוי גבוה = הסניף מוכר אותו במחיר הנפוץ.
 * לוגיקה טהורה (בלי DB) כדי שאפשר לבדוק אותה.
 */

// מוצר שנמכר בלפחות 90% מסניפי הרשת: היעדר שורה בסניף מסונכרן = המחיר הנפוץ.
export const TYPICAL_COVERAGE_THRESHOLD = 0.9;

// תקציב שורות החריגה לרשת. נמדד: כ-130 בתים לשורה (נתונים ואינדקסים), ואשכול
// Atlas חינמי הוא 512MB. 14 רשתות × 150 אלף שורות ≈ 275MB, ומשאיר מקום ל-prices
// ולשאר האוספים. רשת שחורגת (מחירים שמשתנים הרבה בין סניפים) לא נשמרת ברמת
// סניף בכלל, ונשארת בהשוואה ברמת רשת מסומנת "לא מאומת". חלקי-נתונים היה גרוע
// יותר: שורה חסרה למוצר בכיסוי גבוה מוסקת בטעות כמחיר הנפוץ.
export const MAX_EXCEPTION_ROWS_PER_CHAIN = 150_000;

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

// האם צריך לשמור שורה מפורשת לסניף: מחיר חריג, או מוצר בכיסוי נמוך.
export function needsExplicitRow(price: number, stats: BarcodeStats | undefined): boolean {
  if (!stats) return true;
  return cents(price) !== cents(stats.modalPrice) || stats.coverage < TYPICAL_COVERAGE_THRESHOLD;
}

// למה שורה נשמרת: מחיר שונה מהנפוץ, או מוצר בכיסוי נמוך במחיר הנפוץ. הפיצול נחוץ
// לכיוונון הסף והתקציב (ראו TYPICAL_COVERAGE_THRESHOLD ו-MAX_EXCEPTION_ROWS_PER_CHAIN).
export function classifyExplicitRow(price: number, stats: BarcodeStats | undefined): 'priceDiffers' | 'lowCoverage' | null {
  if (!stats) return 'lowCoverage';
  if (cents(price) !== cents(stats.modalPrice)) return 'priceDiffers';
  return stats.coverage < TYPICAL_COVERAGE_THRESHOLD ? 'lowCoverage' : null;
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
