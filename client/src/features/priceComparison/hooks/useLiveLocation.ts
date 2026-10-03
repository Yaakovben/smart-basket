import { useEffect, useMemo, useState } from 'react';
import type { UserLocation } from './useUserLocation';
import { geoPermission, isGeoSupported, watchGeoPosition } from '../../../global/services/geo';

export interface LiveLocation extends UserLocation {
  // רדיוס הדיוק במטרים, כפי שהמכשיר מדווח
  accuracy?: number;
  // true = מיקום חי מהסשן הזה. false = מיקום שמור, שיכול להיות ישן
  live: boolean;
}

// מיקום חי ומדויק בזמן שעמוד הסריקה פתוח. המיקום השמור של האפליקציה יכול להיות
// בן חצי שעה ובדיוק נמוך (למשל מהבית), ואז הסופר שהמשתמש עומד בו לא מזוהה.
// כאן: GPS מדויק (enableHighAccuracy), מתעדכן תוך כדי תנועה, ונעצר ביציאה מהעמוד.
// עד שמגיע מיקום חי, מחזירים את השמור (live=false).
export function useLiveLocation(stored: UserLocation | null, permitted: boolean): LiveLocation | null {
  const [live, setLive] = useState<LiveLocation | null>(null);

  useEffect(() => {
    if (!permitted || !isGeoSupported()) return;
    let cancelled = false;
    let stop: (() => void) | null = null;

    const start = async () => {
      // מעקב רק כשההרשאה כבר ניתנת. אם המערכת במצב "לשאול בכל פעם" (כך בדרך
      // כלל באתר שמותקן למסך הבית באייפון), מעקב היה פותח חלון בקשה בכל כניסה
      // לעמוד הסריקה. אז נשארים עם המיקום השמור. unknown: דפדפן בלי
      // Permissions API למיקום, כמו קודם.
      const perm = await geoPermission();
      if (cancelled || (perm !== 'granted' && perm !== 'unknown')) return;
      stop = watchGeoPosition(
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
        (pos) => { if (!cancelled) setLive({ ...pos, live: true }); },
      );
    };
    void start();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [permitted]);

  // אובייקט יציב בין רינדורים, כדי שבדיקות שתלויות במיקום לא ירוצו סתם
  const storedLat = stored?.lat;
  const storedLng = stored?.lng;
  const fallback = useMemo<LiveLocation | null>(
    () => (storedLat !== undefined && storedLng !== undefined ? { lat: storedLat, lng: storedLng, live: false } : null),
    [storedLat, storedLng],
  );
  return live ?? fallback;
}

// מרחק במטרים בין שני מיקומים (קירוב מספיק למרחקים קצרים)
export function metersBetween(a: UserLocation, b: UserLocation): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}
