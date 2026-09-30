import type { ScanPromo } from '../../types/priceComparison.types';
import type { PriceScanStrings } from '../../priceScan.strings';

// מרחק קריא: מטרים עד קילומטר, אחר כך ק"מ
export const formatDistance = (s: PriceScanStrings, distanceM: number, distanceKm: number): string =>
  distanceM < 1000 ? s.meters(Math.max(10, Math.round(distanceM / 10) * 10)) : s.km(distanceKm);

// מבצע מוצג רק כשהמחיר ליחידה בו באמת נמוך מהמחיר הרגיל. מבצע שיקר יותר
// (למשל מבצע על אריזה אחרת שהרשת פרסמה על אותו ברקוד) רק מבלבל: "מבצע ₪7.63"
// ליד מחיר של ₪3.90 נראה כמו טעות.
export function usefulPromo(promo: ScanPromo | null | undefined, regularPrice: number | null | undefined): ScanPromo | null {
  if (!promo) return null;
  if (regularPrice === null || regularPrice === undefined) return promo;
  const unit = promo.unitPrice > 0 ? promo.unitPrice : promo.price / Math.max(1, promo.minQty);
  return unit < regularPrice - 0.005 ? promo : null;
}
