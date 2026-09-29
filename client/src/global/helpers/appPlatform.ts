// מאיפה האפליקציה רצה עכשיו, לדיווח בדף המנהל (כניסות ופתיחות):
//  • ios / android - האפליקציה מהחנות (Capacitor)
//  • pwa - אייקון שהוסף למסך הבית (מצב standalone, בלי שורת כתובת)
//  • browser - דפדפן רגיל
// בלי import של Capacitor: בתוך האפליקציה הנייטיב הוא מוזרק ל-window מראש,
// כך שהקוד הזה לא מגדיל את החבילה שנטענת בפתיחה.
export type AppPlatform = 'browser' | 'pwa' | 'ios' | 'android';

// האם רצים בתוך האפליקציה מהחנות (ולא בדפדפן או כ-PWA). באפליקציה אין
// "התקנה למסך הבית" ואין Web Push, ולכן הצעות כאלה לא מוצגות בה בכלל.
export const isNativeShell = (): boolean => {
  const p = detectAppPlatform();
  return p === 'ios' || p === 'android';
};

export function detectAppPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'browser';
  const native = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.();
  if (native === 'ios' || native === 'android') return native;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    // ספארי ב-iOS מסמן אייקון ממסך הבית כך, בלי תמיכה ב-display-mode
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone ? 'pwa' : 'browser';
}
