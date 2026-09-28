import type { PriceScanStrings } from '../../priceScan.strings';

// מרחק קריא: מטרים עד קילומטר, אחר כך ק"מ
export const formatDistance = (s: PriceScanStrings, distanceM: number, distanceKm: number): string =>
  distanceM < 1000 ? s.meters(Math.max(10, Math.round(distanceM / 10) * 10)) : s.km(distanceKm);
