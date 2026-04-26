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

import { useCallback, useState } from 'react';
import { safeStorage } from '../../../global/helpers';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error';

export interface UserLocation {
  lat: number;
  lng: number;
}

const CACHE_KEY = 'sb_user_location';
const DENIED_KEY = 'sb_user_location_denied';
// תוקף מיקום: 30 דק' - אחרי זה מבקשים רענון שקט ברקע (אבל לא חוסם את ה-UI)
const LOCATION_TTL_MS = 30 * 60 * 1000;

interface CachedLocation {
  lat: number;
  lng: number;
  at: number;
}

// קריאה סינכרונית של המצב הראשוני מ-storage - מאתחלים ישר את ה-state
// (useState עם פונקציה רץ פעם אחת). זה מנקה את ה-useEffect שהיה עושה setState
// אסור ב-effect (React Compiler).
const readInitialState = (): { location: UserLocation | null; status: LocationStatus } => {
  if (safeStorage.get(DENIED_KEY) === '1') {
    return { location: null, status: 'denied' };
  }
  const cached = safeStorage.getJSON<CachedLocation | null>(CACHE_KEY, null);
  if (cached && Date.now() - cached.at < LOCATION_TTL_MS) {
    return { location: { lat: cached.lat, lng: cached.lng }, status: 'granted' };
  }
  return { location: null, status: 'idle' };
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(() => readInitialState().location);
  const [status, setStatus] = useState<LocationStatus>(() => readInitialState().status);

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
        safeStorage.remove(DENIED_KEY);
      },
      (err) => {
        // קוד 1 = PERMISSION_DENIED. שומרים דגל כדי לא להציק בכניסות הבאות.
        if (err.code === 1) {
          setStatus('denied');
          safeStorage.set(DENIED_KEY, '1');
        } else {
          setStatus('error');
        }
      },
      {
        enableHighAccuracy: false,  // דיוק עירוני מספיק; חוסך סוללה
        timeout: 10_000,
        maximumAge: 5 * 60 * 1000,  // מקבלים מיקום cache של עד 5 דק' מהדפדפן
      }
    );
  }, []);

  // מאפשר למשתמש להתחיל מחדש אחרי שסירב (למשל אחרי שהוא שינה הרשאה ידנית)
  const resetDenied = useCallback(() => {
    safeStorage.remove(DENIED_KEY);
    setStatus('idle');
  }, []);

  return { location, status, requestLocation, resetDenied };
}
