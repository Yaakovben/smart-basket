/**
 * בדיקת תקינות של פיד שהורד, לפני שהוא נוגע במאגר.
 *
 * העיקרון: פיד שנכשל בבדיקה לא נכתב בכלל, והנתונים הקיימים נשארים כמו שהם.
 * פורטל שהחזיר קובץ ריק או חלקי (תקלה אצל הרשת, הורדה שנקטעה) לא אמור למחוק
 * מחירים ומבצעים תקינים מאתמול.
 *
 * לוגיקה טהורה (בלי DB) כדי שאפשר לבדוק אותה.
 */

import type { ChainPriceItem } from '../chains/types';

export interface ValidationResult {
  ok: boolean;
  // סיבת הכישלון, לשמירה בלוג הסנכרון
  reason?: string;
}

// ירידה חדה מזו מול הסנכרון הקודם מעידה על קובץ חלקי ולא על שינוי אמיתי ברשת
export const MAX_DROP_RATIO = 0.6;
// מתחת לזה הרשת קטנה מדי כדי שירידה באחוזים תהיה סימן לתקלה
export const MIN_PREVIOUS_FOR_DROP_CHECK = 500;
// לפחות חצי מהשורות צריכות להיות תקינות, אחרת מבנה הקובץ כנראה השתנה
export const MIN_VALID_RATIO = 0.5;

export interface PriceFeedStats {
  total: number;
  valid: number;
  missingBarcode: number;
  invalidPrice: number;
  missingStore: number;
  distinctBarcodes: number;
  invalidUpdateDate: number;
}

const isValidPrice = (p: unknown): boolean => typeof p === 'number' && Number.isFinite(p) && p > 0 && p <= 10_000;

export function collectPriceFeedStats(items: ChainPriceItem[]): PriceFeedStats {
  const stats: PriceFeedStats = {
    total: items.length, valid: 0, missingBarcode: 0, invalidPrice: 0,
    missingStore: 0, distinctBarcodes: 0, invalidUpdateDate: 0,
  };
  // בלי Set של כל זוגות (סניף, ברקוד): ברשת גדולה אלה מיליוני מחרוזות, וזה כבר
  // הפיל את הסנכרון מחוסר זיכרון. כפילויות נספרות מהסטטיסטיקה, ראו countDuplicateRows.
  const barcodes = new Set<string>();
  for (const it of items) {
    if (!it.barcode) { stats.missingBarcode++; continue; }
    if (!isValidPrice(it.price)) { stats.invalidPrice++; continue; }
    if (!it.storeId) stats.missingStore++;
    if (it.itemPriceUpdateDate && Number.isNaN(new Date(it.itemPriceUpdateDate).getTime())) stats.invalidUpdateDate++;
    barcodes.add(it.barcode);
    stats.valid++;
  }
  stats.distinctBarcodes = barcodes.size;
  return stats;
}

// שורות כפולות (אותו סניף ואותו ברקוד יותר מפעם אחת): שורות תקינות עם סניף, פחות
// מספר הזוגות השונים. storeCounts = מספר הסניפים לכל ברקוד (buildBarcodeStats).
export function countDuplicateRows(rowsWithStore: number, storeCounts: Iterable<number>): number {
  let distinctPairs = 0;
  for (const c of storeCounts) distinctPairs += c;
  return Math.max(0, rowsWithStore - distinctPairs);
}

// האם הכמות החדשה נפלה בחדות מול הקודמת
function droppedSharply(current: number, previous: number | undefined): boolean {
  if (!previous || previous < MIN_PREVIOUS_FOR_DROP_CHECK) return false;
  return current < previous * (1 - MAX_DROP_RATIO);
}

// previousBarcodes = כמה מוצרים שמורים היום לרשת (לפני הסנכרון)
// מתחת לזה ירידה במספר הסניפים בפיד לא נבדקת (רשת קטנה, סניף שנסגר)
export const MIN_PREVIOUS_STORES_FOR_DROP_CHECK = 5;

// feedStores / previousStores = כמה סניפים הופיעו בפיד עכשיו ובסנכרון הקודם.
// פורטל שמציג רק את קובצי היום (laibcatalog, קרפור) מחזיר מוקדם בבוקר קובץ או
// שניים: מספר המוצרים דומה, אבל אם הפיד יתקבל, כיסוי המחירים של כל שאר הסניפים יימחק.
export function validatePriceFeed(
  stats: PriceFeedStats, previousBarcodes?: number, feedStores?: number, previousStores?: number,
): ValidationResult {
  if (stats.total === 0) return { ok: false, reason: 'empty_feed' };
  if (stats.valid / stats.total < MIN_VALID_RATIO) {
    return { ok: false, reason: `too_many_invalid_rows:${stats.total - stats.valid}/${stats.total}` };
  }
  if (droppedSharply(stats.distinctBarcodes, previousBarcodes)) {
    return { ok: false, reason: `barcode_count_dropped:${previousBarcodes}->${stats.distinctBarcodes}` };
  }
  if (feedStores !== undefined && previousStores !== undefined && previousStores >= MIN_PREVIOUS_STORES_FOR_DROP_CHECK
    && feedStores < previousStores * (1 - MAX_DROP_RATIO)) {
    return { ok: false, reason: `store_count_dropped:${previousStores}->${feedStores}` };
  }
  return { ok: true };
}

export function validateStoresFeed(count: number, previousCount?: number): ValidationResult {
  if (count === 0) return { ok: false, reason: 'empty_feed' };
  // סניפים לא נמחקים בסנכרון (upsert בלבד), אבל ירידה חדה היא סימן לקובץ שגוי
  if (previousCount && previousCount >= 20 && count < previousCount * (1 - MAX_DROP_RATIO)) {
    return { ok: false, reason: `store_count_dropped:${previousCount}->${count}` };
  }
  return { ok: true };
}

// filesOk/filesTotal = כמה קובצי סניף הורדו ופוענחו בהצלחה
export function validatePromoFeed(input: {
  filesOk: number;
  filesTotal: number;
  promotions: number;
  previousPromotions?: number;
}): ValidationResult {
  if (input.filesTotal === 0) return { ok: false, reason: 'no_promo_files' };
  if (input.filesOk / input.filesTotal < MIN_VALID_RATIO) {
    return { ok: false, reason: `too_many_failed_files:${input.filesTotal - input.filesOk}/${input.filesTotal}` };
  }
  // רשת בלי אף מבצע תקף זה אפשרי (סופר ספיר מפרסמת קבצים ריקים), אבל רק אם גם קודם לא היו
  if (input.promotions === 0 && (input.previousPromotions ?? 0) > 0) {
    return { ok: false, reason: `promotions_vanished:${input.previousPromotions}->0` };
  }
  if (droppedSharply(input.promotions, input.previousPromotions)) {
    return { ok: false, reason: `promotion_count_dropped:${input.previousPromotions}->${input.promotions}` };
  }
  return { ok: true };
}
