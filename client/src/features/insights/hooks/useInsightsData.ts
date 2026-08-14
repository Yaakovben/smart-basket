import { useState, useEffect, useRef, useCallback } from 'react';
import { insightsApi, type InsightsData } from '../../../services/api';
import { priceComparisonApi, useUserLocation, type PriceComparisonData } from '../../priceComparison';
import { safeStorage } from '../../../global/helpers';
import { INSIGHTS_CACHE_KEY, PRICE_CACHE_KEY, ALL_LISTS_PRICE_CACHE_KEY, readCache, writeCache } from '../helpers/insightsCache';
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

// קריאת שם המשתמש מ-localStorage (נשמר ע"י SettingsContext בעת טעינת הפרופיל).
// מונע קריאת API כפולה ל-/users/me שמתבצעת ממילא ב-SettingsContext בכל mount.
const readCachedUserName = (): string | null => {
  try { return localStorage.getItem('sb_user_name') ?? null; } catch { return null; }
};

// טעינה/רענון של insights + השוואת מחירים, כולל cache מקומי לפתיחה מיידית
// ובחירת רשימה נשמרת. כל ה-state של מסך התובנות מרוכז כאן.
export function useInsightsData(tab: InsightTab) {
  // initialInsightsCache נשמר ב-ref כדי לקרוא localStorage פעם אחת בלבד
  // (לא בכל רינדור) ובכל זאת לשתף את הערך בין אתחול data ל-loading.
  const initCacheRef = useRef<InsightsData | null | undefined>(undefined);
  if (initCacheRef.current === undefined) {
    initCacheRef.current = readCache<InsightsData>(INSIGHTS_CACHE_KEY);
  }
  const [data, setData] = useState<InsightsData | null>(initCacheRef.current);
  const [priceData, setPriceData] = useState<PriceComparisonData | null>(() => readCache<PriceComparisonData>(PRICE_CACHE_KEY));
  const [loading, setLoading] = useState(initCacheRef.current === null);
  const [error, setError] = useState(false);
  // true אחרי שהתשובה האמיתית הראשונה מהשרת (לא cache) חזרה במאונט הזה.
  // משמש למקטעים שתלויים במידע שעלול "לקפוץ" אם נציג אותם על בסיס cache
  // שעלול להיות חסר/מיושן (למשל פילוח הוצאות לפי רשימה) - הם מציגים skeleton
  // עד ש-dataFresh=true, במקום להיעלם ואז להופיע פתאום כשה-fetch מסתיים.
  const [dataFresh, setDataFresh] = useState(false);
  // שם המשתמש נקרא מ-localStorage שמולא ע"י SettingsContext - ללא קריאת API.
  // אין צורך ב-state כי הערך אינו משתנה במהלך החיים של הקומפוננטה.
  const currentUserName = readCachedUserName();
  const [priceLoading, setPriceLoading] = useState(() => readCache<PriceComparisonData>(PRICE_CACHE_KEY) === null);
  const [priceLoadingLabel, setPriceLoadingLabel] = useState<string>('משווה מחירים...');
  const [priceError, setPriceError] = useState(false);
  // השוואת מחירים לא-מסוננת (כל הרשימות, בלי listId) - ייעודי לטאב "רשימות".
  // priceData הרגיל מוגבל לרשימה שנבחרה בטאב "מחירים" (selectedListId) -
  // שימוש בו לטאב "רשימות" (שאמור להראות סקירה של הכל) גרם לקבוצה אחת בלבד
  // להיראות כשיש רשימה ספציפית נבחרת. state נפרד לגמרי כדי לא לגעת בהתנהגות
  // הקיימת/הביצועים של טאב "מחירים".
  const [allListsPriceData, setAllListsPriceData] = useState<PriceComparisonData | null>(() => readCache<PriceComparisonData>(ALL_LISTS_PRICE_CACHE_KEY));

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

  // רענון insights - מעדכן cache מקומי לפעם הבאה.
  //
  // setData מדלג על עדכון אם התוכן זהה בפועל לקודם (JSON.stringify - הכל כאן
  // JSON טהור, בלי Date/פונקציות). קריטי כי fetchInsights רץ אוטומטית בכל
  // visibilitychange (למטה) - בלי ההשוואה, כל חזרה לטאב הייתה יוצרת אובייקט
  // data חדש (רפרנס שונה) גם כשהתוכן זהה לחלוטין, ומפילה re-render מלא על כל
  // עץ הקומפוננטות הכבד של טאב הפעילות (גרפים כולל) - בדיוק תחושת "הכל מגיב
  // לאט" שדווחה, בלי שום שינוי אמיתי בנתונים שמצדיק אותה.
  const fetchInsights = useCallback(() => {
    insightsApi.getInsights()
      .then(res => {
        setData(prev => (prev && JSON.stringify(prev) === JSON.stringify(res)) ? prev : res);
        writeCache(INSIGHTS_CACHE_KEY, res);
        setError(false);
        setDataFresh(true);
      })
      .catch(() => {
        // retry אחד אחרי 3 שניות - מכסה CursorKilled (MongoDB 134) ו-cold start
        setTimeout(() => {
          insightsApi.getInsights()
            .then(res => {
              setData(prev => (prev && JSON.stringify(prev) === JSON.stringify(res)) ? prev : res);
              writeCache(INSIGHTS_CACHE_KEY, res);
              setError(false);
              setDataFresh(true);
            })
            .catch(() => setError(true));
        }, 3000);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- טעינה ראשונית בלבד, ראו fetchInsights לרענון חוזר
  }, []);

  // רענון חוזר כשחוזרים לטאב/לאפליקציה - בלי זה, לחזור לתובנות אחרי שסימנת
  // מוצר כנקנה ברשימה (בטאב/דף אחר) מציג נתונים ישנים מה-mount הקודם עד
  // שתעשה רענון ידני. אותו דפוס בדיוק כמו useLists.ts.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchInsights();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchInsights]);

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

  // גרסה לא-מסוננת (כל הרשימות) לטאב "רשימות" בלבד - נטענת פעם אחת כשנכנסים
  // לטאב הזה (לא תלויה ב-selectedListId, אז לא נטענת שוב כשמחליפים רשימה
  // נבחרת בטאב "מחירים"). יש cache בשרת לפי userId עבור המקרה הלא-מסונן,
  // כך שזה לרוב זול/מהיר גם אם המשתמש כבר טען את טאב "מחירים" בלי סינון.
  useEffect(() => {
    if (tab !== 'lists' || allListsPriceData) return;
    let cancelled = false;
    priceComparisonApi.getComparison(undefined, userLocation ?? undefined)
      .then(res => {
        if (cancelled) return;
        setAllListsPriceData(res);
        writeCache(ALL_LISTS_PRICE_CACHE_KEY, res);
      })
      .catch(() => { /* טאב "רשימות" נופל בחזרה ל-groupStats אם זה נכשל */ });
    return () => { cancelled = true; };
  }, [tab, allListsPriceData, userLocation]);

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
    data, priceData, allListsPriceData, loading, error, dataFresh, currentUserName,
    priceLoading, priceLoadingLabel, priceError, retryPriceFetch,
    selectedListId, setSelectedListId, allUserLists,
    userLocation, locationStatus, requestLocation, resetLocationDenied,
  };
}
