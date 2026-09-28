import { useCallback, useEffect, useRef, useState } from 'react';
import { safeStorage } from '../../../global/helpers';
import { emitPlanLimit } from '../../../global/helpers/planLimitEvent';
import { priceComparisonApi } from '../services/priceComparison.api';
import type { BarcodeScanResult } from '../types/priceComparison.types';
import { metersBetween, type LiveLocation } from './useLiveLocation';

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
// בלי לחכות לשרת. המחירים משתנים רק פעם ביום, אז 10 דקות בטוח.
const CACHE_TTL_MS = 10 * 60_000;
const resultCache = new Map<string, { at: number; value: BarcodeScanResult | null }>();
// מפתח לפי מיקום מעוגל לכ-100 מטר ודיוק מעוגל, כדי שמעבר לסופר אחר יביא תוצאה חדשה
const cacheKey = (barcode: string, loc: LiveLocation | null) =>
  loc ? `${barcode}@${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}~${loc.accuracy !== undefined && loc.accuracy <= 100 ? 'fine' : 'coarse'}` : barcode;

// אחרי זמן זה בטעינה מציגים "לוקח יותר זמן מהרגיל" (השרת מתעורר, קליטה חלשה)
const SLOW_AFTER_MS = 5_000;
// אחרי זמן זה מפסיקים לחכות ומציעים לנסות שוב
const TIMEOUT_MS = 30_000;
// שינוי מיקום שמצדיק בדיקה חוזרת: יותר מזה במטרים, או מעבר ממיקום גס למדויק
const REFETCH_MOVE_M = 120;
const FINE_ACCURACY_M = 100;

export const isValidBarcode = (code: string) => /^\d{6,14}$/.test(code);

// לוגיקת עמוד "איפה הכי זול": בדיקת מחיר לברקוד, ביטול, מטמון, בדיקה חוזרת כשהמיקום
// מתעדכן, והיסטוריית סריקות אחרונות (במכשיר בלבד, לנוחות).
export function usePriceScan(location: LiveLocation | null) {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [result, setResult] = useState<BarcodeScanResult | null>(null);
  const [slow, setSlow] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // בדיקה חוזרת ברקע (המיקום השתפר) בזמן שהתוצאה הקודמת מוצגת
  const [refreshing, setRefreshing] = useState(false);
  const [recent, setRecent] = useState<RecentScan[]>(() => safeStorage.getJSON<RecentScan[]>(RECENT_KEY, []));
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  // המיקום שאיתו נשלחה הבדיקה האחרונה
  const fetchedWithRef = useRef<LiveLocation | null>(null);

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

  const check = useCallback(async (code: string, opts: { silent?: boolean } = {}) => {
    const id = ++requestIdRef.current;
    abortRef.current?.abort();
    setBarcode(code);
    setSlow(false);
    setTimedOut(false);
    fetchedWithRef.current = location;

    const key = cacheKey(code, location);
    const hit = resultCache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      setResult(hit.value);
      setPhase(hit.value ? 'result' : 'notFound');
      setRefreshing(false);
      if (hit.value) remember(hit.value);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    if (opts.silent) setRefreshing(true);
    else setPhase('loading');
    const slowTimer = window.setTimeout(() => { if (id === requestIdRef.current) setSlow(true); }, SLOW_AFTER_MS);
    const timeoutTimer = window.setTimeout(() => {
      if (id !== requestIdRef.current) return;
      setTimedOut(true);
      controller.abort();
    }, TIMEOUT_MS);
    try {
      const data = await priceComparisonApi.scanProduct(code, location, controller.signal);
      resultCache.set(key, { at: Date.now(), value: data });
      if (id !== requestIdRef.current) return;
      setResult(data);
      setPhase(data ? 'result' : 'notFound');
      if (data) remember(data);
    } catch (err) {
      if (id !== requestIdRef.current) return;
      // בדיקה חוזרת ברקע שנכשלה: התוצאה הקודמת נשארת
      if (opts.silent) return;
      if ((err as { response?: { status?: number } })?.response?.status === 402) {
        emitPlanLimit('priceComparison');
        setPhase('idle');
        return;
      }
      setPhase('error');
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
      if (id === requestIdRef.current) {
        setRefreshing(false);
        setSlow(false);
      }
    }
  }, [location, remember]);

  // ביטול בדיקה שלוקחת זמן: חוזרים למצב שלפניה
  const cancel = useCallback(() => {
    requestIdRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    setSlow(false);
    setRefreshing(false);
    setPhase(result && result.barcode === barcode ? 'result' : 'idle');
  }, [result, barcode]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // המיקום התעדכן אחרי הבדיקה: בודקים שוב ברקע אם לא היה מיקום, אם המשתמש זז
  // (נכנס לסופר אחר), או אם המיקום הפך ממשוער למדויק. התוצאה הקודמת נשארת מוצגת.
  // (בשרת סריקה חוזרת של אותו מוצר באותו יום לא נספרת שוב במכסה.)
  useEffect(() => {
    if (!location || !barcode || phase !== 'result') return;
    const prev = fetchedWithRef.current;
    const becameFine = location.accuracy !== undefined && location.accuracy <= FINE_ACCURACY_M
      && (prev?.accuracy === undefined || prev.accuracy > FINE_ACCURACY_M);
    const moved = prev ? metersBetween(prev, location) > REFETCH_MOVE_M : true;
    if (!moved && !becameFine) return;
    const timer = window.setTimeout(() => { void check(barcode, { silent: true }); }, 0);
    return () => window.clearTimeout(timer);
  }, [location, barcode, phase, check]);

  const clearRecent = useCallback(() => {
    setRecent([]);
    safeStorage.remove(RECENT_KEY);
  }, []);

  return { barcode, phase, result, slow, timedOut, refreshing, recent, check, cancel, clearRecent };
}
