/**
 * useUserLocation - הוק שמבקש מיקום מהמשתמש (דרך global/services/geo) ומנהל
 * את מצב ההרשאה + caching בסשן.
 *
 * מצבים:
 *   idle         - עוד לא ביקשנו הרשאה (ראשון)
 *   requesting   - הבקשה בדרך (loader)
 *   granted      - קיבלנו מיקום (location יהיה לא-null)
 *   denied       - המשתמש דחה
 *   unavailable  - אין תמיכה / הדפדפן לא חשף
 *   error        - שגיאה אחרת (timeout / position unavailable)
 *
 * הסכם שימוש: קוראים ל-requestLocation() כשהמשתמש לוחץ על כפתור.
 * לא מבקשים אוטומטית - הרשאת geolocation רגישה ודורשת הסכמה מפורשת.
 */

import { useCallback, useEffect, useState } from 'react';
import { safeStorage } from '../../../global/helpers';
import { geoPermission, getGeoPosition, isGeoSupported, type GeoPosition } from '../../../global/services/geo';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'blocked' | 'unavailable' | 'error';

export interface UserLocation {
  lat: number;
  lng: number;
}

const CACHE_KEY = 'sb_user_location';
const DENIED_KEY = 'sb_user_location_denied';
const GRANTED_KEY = 'sb_user_location_granted'; // דגל "פעם אחת אישר" - לא פג תוקף
// תוקף הקואורדינטות: 7 ימים. אחרי זה נרענן ברקע בלי לזרוק את ה-status.
// מטרה: לא להראות "הפעל מיקום" שוב למשתמש שכבר אישר פעם אחת.
const COORDS_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000;
// רענון רקע: אם הקואורדינטות בנות יותר מ-30 דק', נרענן בשקט בכניסה
const COORDS_REFRESH_MS = 30 * 60 * 1000;

interface CachedLocation {
  lat: number;
  lng: number;
  at: number;
}

// קריאה סינכרונית של המצב הראשוני מ-storage - מאתחלים ישר את ה-state.
// כללים:
// 1. denied → 'denied' (עד resetDenied)
// 2. יש קואורדינטות טריות (≤7 יום) → 'granted' מיד, גם בלי לבקש שוב
// 3. הדגל "אישר בעבר" קיים אבל אין קואורדינטות → 'granted' עם location=null,
//    הרענון ברקע ימלא את הקואורדינטות. לא מציגים "הפעל מיקום" כי הוא כבר אישר.
// 4. אחרת → 'idle' (משתמש חדש)
const readInitialState = (): { location: UserLocation | null; status: LocationStatus } => {
  if (safeStorage.get(DENIED_KEY) === '1') {
    return { location: null, status: 'denied' };
  }
  const cached = safeStorage.getJSON<CachedLocation | null>(CACHE_KEY, null);
  if (cached && Date.now() - cached.at < COORDS_FRESHNESS_MS) {
    return { location: { lat: cached.lat, lng: cached.lng }, status: 'granted' };
  }
  if (safeStorage.get(GRANTED_KEY) === '1') {
    // אישר בעבר אבל הקואורדינטות פגו - מציגים granted כי הרענון ברקע יתפוס.
    return { location: null, status: 'granted' };
  }
  return { location: null, status: 'idle' };
};

// הרשאה שמאפשרת קריאה שקטה בלי חלון בקשה: granted, או unknown (דפדפן בלי
// Permissions API למיקום) כשהמשתמש כבר אישר בעבר
const canReadSilently = async (): Promise<boolean> => {
  const perm = await geoPermission();
  return perm === 'granted' || perm === 'unknown';
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(() => readInitialState().location);
  const [status, setStatus] = useState<LocationStatus>(() => readInitialState().status);

  const saveGranted = useCallback((pos: GeoPosition) => {
    const loc: UserLocation = { lat: pos.lat, lng: pos.lng };
    setLocation(loc);
    setStatus('granted');
    safeStorage.setJSON<CachedLocation>(CACHE_KEY, { ...loc, at: Date.now() });
    safeStorage.set(GRANTED_KEY, '1');
    safeStorage.remove(DENIED_KEY);
  }, []);

  // רענון שקט: לא משנה status (שלא יקפוץ "מבקש מיקום..."), רק מעדכן location.
  // אם הדפדפן ביטל הרשאה (err.code===1), זה מוחזר ל-denied.
  //
  // לפני קריאה בפועל בודקים את מצב ההרשאה האמיתי דרך Permissions API (לא
  // רק flag ב-localStorage) - קריאה "שקטה" ל-getCurrentPosition כשההרשאה
  // כבר לא 'granted' בפועל (הדפדפן/OS ביטלו אותה ברקע - iOS ITP, "unused
  // permissions" auto-revoke בכרום וכו') מציגה prompt נייטיבי בלי שום
  // אינטראקציה של המשתמש - בדיוק התלונה "מבקש הרשאה שוב לבד". דפדפנים בלי
  // תמיכה ב-Permissions API ל-geolocation (חלק מגרסאות Safari) ממשיכים
  // להתנהגות הקודמת.
  const silentRefresh = useCallback(async () => {
    if (!isGeoSupported() || !(await canReadSilently())) return;
    try {
      saveGranted(await getGeoPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 }));
    } catch (err) {
      // אם המערכת ביטלה הרשאה אחרי שהמשתמש אישר - מוחקים את הדגל
      if ((err as { code?: number }).code === 1) {
        safeStorage.remove(GRANTED_KEY);
        safeStorage.remove(CACHE_KEY);
        setLocation(null);
        setStatus('denied');
        safeStorage.set(DENIED_KEY, '1');
      }
      // שאר השגיאות (timeout, position unavailable) - לא משנים את ה-UI כדי לא להציק
    }
  }, [saveGranted]);

  // הפעלה אוטומטית: אם המשתמש אישר בעבר אבל הקואורדינטות ישנות (או חסרות),
  // מרעננים ברקע. למשתמש חדש (status==='idle') לא מבקשים אוטומטית.
  useEffect(() => {
    if (status !== 'granted') return;
    const cached = safeStorage.getJSON<CachedLocation | null>(CACHE_KEY, null);
    const isStale = !cached || Date.now() - cached.at >= COORDS_REFRESH_MS;
    if (isStale) silentRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = useCallback(() => {
    if (!isGeoSupported()) {
      setStatus('unavailable');
      return;
    }
    // ניקוי דגלי דחייה לפני נסיון חדש - מאפשר ניסיון נוסף אחרי שהמשתמש
    // שינה את ההרשאה בהגדרות הדפדפן.
    safeStorage.remove(DENIED_KEY);
    setStatus('requesting');
    // טיימסטמפ לזיהוי דחייה מיידית = הדפדפן חוסם לצמיתות ולא בכלל מציג prompt
    const requestedAt = Date.now();
    getGeoPosition(
      // timeout מוגדל ל-15 שניות כדי לתת זמן ל-iOS PWA לסיים גם בקליטה איטית
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60 * 1000 },
    ).then(saveGranted).catch((err: { code?: number }) => {
      if (err.code === 1) {
        // אם השגיאה הגיעה בפחות מ-300ms, זו דחייה אוטומטית של הדפדפן
        // (לא בקש prompt מהמשתמש). זה אומר שהמיקום חסום בהגדרות הדפדפן
        // ו'נסה שוב' לא יעזור - צריך לפתוח הגדרות אתר ידנית.
        const wasInstant = Date.now() - requestedAt < 300;
        setStatus(wasInstant ? 'blocked' : 'denied');
        safeStorage.set(DENIED_KEY, '1');
        safeStorage.remove(GRANTED_KEY);
      } else {
        setStatus('error');
      }
    });
  }, [saveGranted]);

  // איפוס denied + ניסיון התחברות מיידי. שימושי ב"נסה שוב" כשהמשתמש סירב
  // ואז שינה את ההרשאה בהגדרות הדפדפן/אפליקציה.
  const retryRequest = useCallback(() => {
    safeStorage.remove(DENIED_KEY);
    setStatus('idle');
    // setTimeout כדי שה-state יתעדכן לפני ה-getCurrentPosition
    setTimeout(() => requestLocation(), 50);
  }, [requestLocation]);

  const resetDenied = useCallback(() => {
    safeStorage.remove(DENIED_KEY);
    setStatus('idle');
  }, []);

  // האזנה לחזרה לחלון/לטאב - מנסה לרענן מיקום אם המשתמש שינה הרשאות
  // בהגדרות הדפדפן/iOS Settings וחזר לאפליקציה. שקט - לא משנה UI אם נכשל.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      // אם המשתמש כעת ב-denied/error/unavailable - ננסה ברקע. אם זה כעת מאושר,
      // ייצא ל-granted; אם עדיין מסורב, נשארים באותו status.
      if (status === 'denied' || status === 'error') {
        if (!isGeoSupported()) return;
        // כמו ב-silentRefresh: רק כשההרשאה כבר ניתנת, כדי שלא יופיע חלון
        // בקשה מפתיע רק מזה שהמשתמש חזר לאפליקציה. כאן נדרש granted מפורש.
        if ((await geoPermission()) !== 'granted') return;
        getGeoPosition({ enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 })
          .then(saveGranted)
          .catch(() => { /* שקט - נשארים באותו status */ });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [status, saveGranted]);

  return { location, status, requestLocation, resetDenied, retryRequest };
}
