/**
 * useUserLocation - הוק שמבקש מיקום מהמשתמש (navigator.geolocation) ומנהל
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

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error';

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

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(() => readInitialState().location);
  const [status, setStatus] = useState<LocationStatus>(() => readInitialState().status);

  // רענון שקט: לא משנה status (שלא יקפוץ "מבקש מיקום..."), רק מעדכן location.
  // אם הדפדפן ביטל הרשאה (err.code===1), זה מוחזר ל-denied.
  const silentRefresh = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setStatus('granted');
        safeStorage.setJSON<CachedLocation>(CACHE_KEY, { ...loc, at: Date.now() });
        safeStorage.set(GRANTED_KEY, '1');
        safeStorage.remove(DENIED_KEY);
      },
      (err) => {
        // אם הדפדפן ביטל הרשאה אחרי שהמשתמש אישר - מוחקים את הדגל ומחזירים ל-idle
        if (err.code === 1) {
          safeStorage.remove(GRANTED_KEY);
          safeStorage.remove(CACHE_KEY);
          setLocation(null);
          setStatus('denied');
          safeStorage.set(DENIED_KEY, '1');
        }
        // שאר השגיאות (timeout, position unavailable) - לא משנים את ה-UI כדי לא להציק
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

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
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setStatus('granted');
        safeStorage.setJSON<CachedLocation>(CACHE_KEY, { ...loc, at: Date.now() });
        safeStorage.set(GRANTED_KEY, '1');
        safeStorage.remove(DENIED_KEY);
      },
      (err) => {
        if (err.code === 1) {
          setStatus('denied');
          safeStorage.set(DENIED_KEY, '1');
          safeStorage.remove(GRANTED_KEY);
        } else {
          setStatus('error');
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const resetDenied = useCallback(() => {
    safeStorage.remove(DENIED_KEY);
    setStatus('idle');
  }, []);

  return { location, status, requestLocation, resetDenied };
}
