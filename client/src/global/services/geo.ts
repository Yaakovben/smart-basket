import { isNativeShell } from '../helpers/appPlatform';

// ===== מיקום: דרך אחת לכל האפליקציה =====
// באפליקציה מהחנות המיקום עובר דרך ההרשאה של מערכת ההפעלה (פלאגין
// Capacitor Geolocation): המשתמש מאשר פעם אחת והאישור נשמר לתמיד. דרך
// navigator.geolocation בתוך ה-WebView, iOS שואל שוב כמעט בכל פתיחה.
// באתר ממשיכים עם navigator.geolocation. הפלאגין נטען רק באפליקציה.

export interface GeoPosition { lat: number; lng: number; accuracy?: number }
export interface GeoOptions { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
export type GeoPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

// שגיאה אחידה: code 1 = ההרשאה נדחתה (כמו ב-GeolocationPositionError)
export class GeoError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

const loadPlugin = async () => (await import('@capacitor/geolocation')).Geolocation;

export const isGeoSupported = (): boolean => isNativeShell() || 'geolocation' in navigator;

export async function geoPermission(): Promise<GeoPermission> {
  if (isNativeShell()) {
    try {
      const { location } = await (await loadPlugin()).checkPermissions();
      return location === 'granted' ? 'granted' : location === 'denied' ? 'denied' : 'prompt';
    } catch { return 'unknown'; }
  }
  if (!navigator.permissions) return 'unknown';
  try {
    const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return perm.state as GeoPermission;
  } catch { return 'unknown'; }
}

export async function getGeoPosition(options: GeoOptions = {}): Promise<GeoPosition> {
  if (isNativeShell()) {
    const Geolocation = await loadPlugin();
    try {
      const pos = await Geolocation.getCurrentPosition(options);
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    } catch (err) {
      // הפלאגין לא מחזיר קוד: בודקים אם ההרשאה היא שנדחתה
      const denied = (await geoPermission()) === 'denied';
      throw new GeoError(denied ? 1 : 2, (err as Error)?.message || 'location_failed');
    }
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new GeoError(err.code, err.message)),
      options,
    );
  });
}

// מעקב רציף. מחזיר פונקציית עצירה.
export function watchGeoPosition(options: GeoOptions, onPosition: (p: GeoPosition) => void): () => void {
  let stopped = false;
  if (isNativeShell()) {
    let id: string | null = null;
    void loadPlugin().then(async (Geolocation) => {
      if (stopped) return;
      id = await Geolocation.watchPosition(options, (pos) => {
        if (pos && !stopped) onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      });
      if (stopped && id) void Geolocation.clearWatch({ id });
    }).catch(() => { /* בלי מיקום חי: נשארים עם השמור */ });
    return () => {
      stopped = true;
      if (id) void loadPlugin().then((Geolocation) => Geolocation.clearWatch({ id: id! }));
    };
  }
  const watchId = navigator.geolocation.watchPosition(
    (pos) => { if (!stopped) onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); },
    () => { /* שגיאה זמנית (אין קליטת GPS בתוך בניין): נשארים עם המיקום האחרון */ },
    options,
  );
  return () => { stopped = true; navigator.geolocation.clearWatch(watchId); };
}
