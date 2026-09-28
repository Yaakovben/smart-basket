import { useCallback, useEffect, useRef, useState } from 'react';
import { safeStorage } from '../../../global/helpers';
import { emitPlanLimit } from '../../../global/helpers/planLimitEvent';
import { priceComparisonApi, type UserLocation } from '../services/priceComparison.api';
import type { BarcodeScanResult } from '../types/priceComparison.types';

export type ScanPhase = 'idle' | 'loading' | 'result' | 'notFound' | 'error';

export interface RecentScan {
  barcode: string;
  name: string;
  // המחיר הזול בכל הארץ בזמן הסריקה (לתצוגה בלבד)
  cheapestPrice: number;
  at: number;
}

const RECENT_KEY = 'sb_price_scan_recent';
const RECENT_MAX = 8;

// מטמון בזיכרון לסשן: חזרה לעמוד או סריקה חוזרת של אותו מוצר מוצגות מיד,
// בלי לחכות לשרת. המחירים משתנים רק פעמיים ביום, אז 10 דקות בטוח.
const CACHE_TTL_MS = 10 * 60_000;
const resultCache = new Map<string, { at: number; value: BarcodeScanResult | null }>();
const cacheKey = (barcode: string, loc: UserLocation | null) =>
  loc ? `${barcode}@${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}` : barcode;

export const isValidBarcode = (code: string) => /^\d{6,14}$/.test(code);

// לוגיקת עמוד "איפה הכי זול": בדיקת מחיר לברקוד, מטמון, והיסטוריית סריקות
// אחרונות (במכשיר בלבד, לנוחות).
export function usePriceScan(location: UserLocation | null) {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [result, setResult] = useState<BarcodeScanResult | null>(null);
  const [recent, setRecent] = useState<RecentScan[]>(() => safeStorage.getJSON<RecentScan[]>(RECENT_KEY, []));
  const requestIdRef = useRef(0);
  // האם הבדיקה האחרונה נשלחה עם מיקום
  const fetchedWithLocationRef = useRef(false);

  const remember = useCallback((r: BarcodeScanResult) => {
    setRecent((prev) => {
      const next = [
        { barcode: r.barcode, name: r.productName, cheapestPrice: r.cheapest.price, at: Date.now() },
        ...prev.filter((x) => x.barcode !== r.barcode),
      ].slice(0, RECENT_MAX);
      safeStorage.setJSON(RECENT_KEY, next);
      return next;
    });
  }, []);

  const check = useCallback(async (code: string) => {
    const id = ++requestIdRef.current;
    setBarcode(code);
    fetchedWithLocationRef.current = !!location;

    const key = cacheKey(code, location);
    const hit = resultCache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      setResult(hit.value);
      setPhase(hit.value ? 'result' : 'notFound');
      if (hit.value) remember(hit.value);
      return;
    }

    setPhase('loading');
    try {
      const data = await priceComparisonApi.scanProduct(code, location);
      resultCache.set(key, { at: Date.now(), value: data });
      if (id !== requestIdRef.current) return;
      setResult(data);
      setPhase(data ? 'result' : 'notFound');
      if (data) remember(data);
    } catch (err) {
      if (id !== requestIdRef.current) return;
      if ((err as { response?: { status?: number } })?.response?.status === 402) {
        emitPlanLimit('priceComparison');
        setPhase('idle');
        return;
      }
      setPhase('error');
    }
  }, [location, remember]);

  // המיקום הגיע אחרי שכבר נבדק מחיר בלעדיו: בודקים שוב, עכשיו עם "קרוב אליך".
  // (בשרת סריקה חוזרת של אותו מוצר באותו יום לא נספרת שוב במכסה.)
  useEffect(() => {
    if (!location || !barcode || fetchedWithLocationRef.current) return;
    const timer = window.setTimeout(() => { void check(barcode); }, 0);
    return () => window.clearTimeout(timer);
  }, [location, barcode, check]);

  const clearRecent = useCallback(() => {
    setRecent([]);
    safeStorage.remove(RECENT_KEY);
  }, []);

  return { barcode, phase, result, recent, check, clearRecent };
}
