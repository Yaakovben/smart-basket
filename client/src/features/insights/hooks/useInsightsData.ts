import { useState, useEffect, useRef } from 'react';
import { insightsApi, authApi, type InsightsData } from '../../../services/api';
import { priceComparisonApi, useUserLocation, type PriceComparisonData } from '../../priceComparison';
import { safeStorage } from '../../../global/helpers';
import { INSIGHTS_CACHE_KEY, PRICE_CACHE_KEY, readCache, writeCache } from '../helpers/insightsCache';
import type { InsightTab, InsightsListMeta } from '../types/insights-types';

// רשימה מלאה של כל הרשימות של המשתמש מ-cached_lists (קיים תמיד אחרי כניסה
// ראשונה לבית), כדי שהבורר יראה את כל הרשימות מיד - גם לפני שהשרת ענה.
const readCachedListsFallback = (): InsightsListMeta[] => {
  try {
    const raw = localStorage.getItem('cached_lists');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.lists)) return [];
    return parsed.lists
      .map((l: { _id?: string; id?: string; name?: string; icon?: string }) => ({
        id: l._id || l.id || '',
        name: l.name || '',
        icon: l.icon || '📋',
      }))
      .filter((l: InsightsListMeta) => l.id);
  } catch { return []; }
};

// טעינה/רענון של insights + השוואת מחירים, כולל cache מקומי לפתיחה מיידית
// ובחירת רשימה נשמרת. כל ה-state של מסך התובנות מרוכז כאן.
export function useInsightsData(tab: InsightTab) {
  const [data, setData] = useState<InsightsData | null>(() => readCache<InsightsData>(INSIGHTS_CACHE_KEY));
  const [priceData, setPriceData] = useState<PriceComparisonData | null>(() => readCache<PriceComparisonData>(PRICE_CACHE_KEY));
  const [loading, setLoading] = useState(() => readCache<InsightsData>(INSIGHTS_CACHE_KEY) === null);
  const [error, setError] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(() => readCache<PriceComparisonData>(PRICE_CACHE_KEY) === null);
  const [priceLoadingLabel, setPriceLoadingLabel] = useState<string>('משווה מחירים...');
  const [priceError, setPriceError] = useState(false);

  // רשימה ספציפית נבחרת - null = כל הרשימות. נשמר ב-localStorage לזכור בחירה
  // בין כניסות. אם אין שמור - מנסים לקחת רשימה ראשונה מ-cache הקיים.
  const [selectedListId, setSelectedListId] = useState<string | null>(() => {
    const saved = safeStorage.getJSON<string | null>('sb_insights_selected_list', null);
    if (saved) return saved;
    const cachedPrice = readCache<PriceComparisonData>(PRICE_CACHE_KEY);
    if (cachedPrice?.lists && cachedPrice.lists.length > 0) return cachedPrice.lists[0].listId;
    return readCachedListsFallback()[0]?.id ?? null;
  });

  const [allUserLists, setAllUserLists] = useState<InsightsListMeta[]>(() => readCachedListsFallback());

  // מיקום המשתמש (אופציונלי) - כשהוא קיים, השרת מצרף סניף קרוב + מרחק לכל רשת.
  const { location: userLocation, status: locationStatus, requestLocation, resetDenied: resetLocationDenied } = useUserLocation();

  // רענון insights ברקע - תמיד רץ, מעדכן cache מקומי לפעם הבאה.
  useEffect(() => {
    insightsApi.getInsights()
      .then(res => { setData(res); writeCache(INSIGHTS_CACHE_KEY, res); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // שליפת שם המשתמש - לא חוסם שום דבר, נכשל בשקט
    authApi.getProfile().then(u => setCurrentUserName(u?.name ?? null)).catch(() => {});
  }, []);

  // שמירת בחירת הרשימה - לא שומרים null ('כל הרשימות'), זה מצב כבד שמאט טעינה.
  useEffect(() => {
    if (selectedListId === null) return;
    safeStorage.setJSON('sb_insights_selected_list', selectedListId);
  }, [selectedListId]);

  // הגנה: אם נכנסנו עם selectedListId=null אבל יש רשימות - בוחרים אוטומטית את
  // הראשונה (מונע fetch כבד של 'כל הרשימות' בכניסה). רץ פעם אחת בלבד.
  const autoSelectedRef = useRef(false);
  // עוקב אחרי המיקום הקודם כדי לזהות מתי המשתמש אישר מיקום בפעם הראשונה
  const prevLocationRef = useRef<typeof userLocation>(null);
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (selectedListId === null && allUserLists.length > 0) {
      autoSelectedRef.current = true;
      // בחירה אוטומטית חד-פעמית ברגע שהרשימות נטענות (אסינכרוני) - לא ניתן לחשב ברינדור
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedListId(allUserLists[0].id);
    } else if (selectedListId !== null) {
      autoSelectedRef.current = true;
    }
  }, [selectedListId, allUserLists]);

  // טעינה/רענון של השוואת מחירים - רץ כשהטאב 'price', selectedListId או userLocation משתנים.
  useEffect(() => {
    if (tab !== 'price') return;
    let cancelled = false;
    // ניסיון יחיד עם retry. השרת ב-Render free נרדם אחרי 15 דק' חוסר פעילות
    // ולוקח עד דקה להתעורר. במקום לזרוק שגיאה מיד - מחכים 4ש' ומנסים שוב.
    const fetchWithRetry = async (): Promise<void> => {
      try {
        const res = await priceComparisonApi.getComparison(selectedListId ?? undefined, userLocation ?? undefined);
        if (cancelled) return;
        setPriceData(res);
        writeCache(PRICE_CACHE_KEY, res);
        if (selectedListId === null && res?.lists && res.lists.length > 0) {
          setAllUserLists(res.lists.map(l => ({ id: l.listId, name: l.listName, icon: l.listIcon })));
          safeStorage.setJSON('sb_insights_selected_list', res.lists[0].listId);
        }
      } catch {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 4000));
        if (cancelled) return;
        try {
          const res = await priceComparisonApi.getComparison(selectedListId ?? undefined, userLocation ?? undefined);
          if (cancelled) return;
          setPriceData(res);
          writeCache(PRICE_CACHE_KEY, res);
          if (selectedListId === null && res?.lists && res.lists.length > 0) {
            setAllUserLists(res.lists.map(l => ({ id: l.listId, name: l.listName, icon: l.listIcon })));
          }
        } catch {
          if (!cancelled) setPriceError(true);
        }
      }
    };

    const timer = window.setTimeout(() => {
      setPriceLoading(true);
      setPriceError(false);
      setPriceLoadingLabel(userLocation && !prevLocationRef.current ? 'מאתר סניפים קרובים...' : 'משווה מחירים...');
      prevLocationRef.current = userLocation;
      fetchWithRetry().finally(() => { if (!cancelled) setPriceLoading(false); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [tab, selectedListId, userLocation]);

  // ניסיון ידני יחיד - משמש את כפתור "נסה שוב" במסך שגיאת מחירים
  const retryPriceFetch = () => {
    setPriceError(false);
    setPriceLoading(true);
    priceComparisonApi.getComparison(selectedListId ?? undefined, userLocation ?? undefined)
      .then(res => { setPriceData(res); writeCache(PRICE_CACHE_KEY, res); })
      .catch(() => setPriceError(true))
      .finally(() => setPriceLoading(false));
  };

  return {
    data, priceData, loading, error, currentUserName,
    priceLoading, priceLoadingLabel, priceError, retryPriceFetch,
    selectedListId, setSelectedListId, allUserLists,
    userLocation, locationStatus, requestLocation, resetLocationDenied,
  };
}
