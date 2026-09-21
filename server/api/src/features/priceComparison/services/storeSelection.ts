import { normStoreId } from './storeId';

/**
 * בחירת הסניפים שעבורם שומרים מחירים ברמת סניף (branch_prices).
 *
 * הנפח הוא הגבלה אמיתית: אשכול Atlas חינמי מוגבל ל-512MB, ורשת אחת יכולה
 * להוסיף מאות אלפי שורות (סניף × מוצר). לכן שומרים רק מספר קטן של סניפים
 * לכל רשת, ובוחרים אותם כך שיפוזרו גיאוגרפית: כך לרוב המשתמשים יש סניף
 * מתומחר במרחק סביר, במקום ריכוז של כל הסניפים באותה עיר.
 * מחיר "הזול ברשת" (Price.model) נשמר תמיד לכל הרשת ולא מושפע מהתקרה.
 */

export interface StoreCandidate {
  storeId: string;
  lat?: number;
  lng?: number;
}

// תקרת הסניפים לרשת. 12 × ~7,000 מוצרים × 14 רשתות ≈ 1.2M שורות, כ-130MB.
export const MAX_PRICED_STORES_PER_CHAIN = 12;

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const hasCoords = (c: StoreCandidate): c is StoreCandidate & { lat: number; lng: number } =>
  typeof c.lat === 'number' && typeof c.lng === 'number';

// מחזיר עד `cap` מזהי סניפים לשמירת מחירים.
// 1. קודם סניפים שכבר מתומחרים (preferred) - יציבות, בלי מחיקה וכתיבה חוזרת.
// 2. אחר כך בחירה חמדנית של הסניף הרחוק ביותר מהנבחרים (פיזור גיאוגרפי).
// 3. סניפים בלי קואורדינטות נכנסים רק אם נשאר מקום - אי אפשר לחשב להם מרחק.
export function selectStoresToPrice(
  candidates: StoreCandidate[],
  preferred: Set<string> = new Set(),
  cap: number = MAX_PRICED_STORES_PER_CHAIN
): string[] {
  const preferredNorm = new Set(Array.from(preferred, normStoreId));
  const unique = new Map<string, StoreCandidate>();
  for (const c of candidates) if (!unique.has(normStoreId(c.storeId))) unique.set(normStoreId(c.storeId), c);
  const pool = Array.from(unique.values());

  const selected: StoreCandidate[] = pool.filter(c => preferredNorm.has(normStoreId(c.storeId))).slice(0, cap);
  const taken = new Set(selected.map(c => normStoreId(c.storeId)));
  const withCoords = pool.filter(c => !taken.has(normStoreId(c.storeId)) && hasCoords(c));
  const withoutCoords = pool.filter(c => !taken.has(normStoreId(c.storeId)) && !hasCoords(c));

  while (selected.length < cap && withCoords.length > 0) {
    const anchors = selected.filter(hasCoords);
    let bestIdx = 0;
    if (anchors.length > 0) {
      let bestDist = -1;
      withCoords.forEach((c, i) => {
        const minDist = Math.min(...anchors.map(a => haversineKm(a as { lat: number; lng: number }, c as { lat: number; lng: number })));
        if (minDist > bestDist) { bestDist = minDist; bestIdx = i; }
      });
    }
    selected.push(withCoords.splice(bestIdx, 1)[0]);
  }
  for (const c of withoutCoords) {
    if (selected.length >= cap) break;
    selected.push(c);
  }
  return selected.map(c => c.storeId);
}
