import { useEffect, useMemo, useState } from 'react';
import type { UserLocation } from './useUserLocation';

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
    if (!permitted || !('geolocation' in navigator)) return;
    let cancelled = false;
    let watchId: number | null = null;

    const start = async () => {
      // לא מציגים בקשת הרשאה יזומה מתוך רקע: אם ההרשאה נחסמה, לא מבקשים
      if (navigator.permissions) {
        try {
          const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (perm.state === 'denied') return;
        } catch { /* אין תמיכה ב-Permissions API לגיאולוקיישן - ממשיכים */ }
      }
      if (cancelled) return;
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          setLive({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, live: true });
        },
        () => { /* שגיאה זמנית (אין קליטת GPS בתוך בניין): נשארים עם המיקום האחרון */ },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
      );
    };
    void start();

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
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
