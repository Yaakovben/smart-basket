// ניקוי מלא (ביטול רישום SW + caches + sessionStorage) ורענון קשיח - הפעולה
// המשותפת לכל מסלולי ההתאוששות מ-JS ישן אחרי דיפלוי: הכפתור הידני
// ב-ErrorBoundaryFallback, ההתאוששות האוטומטית משגיאת טעינת chunk
// (ErrorBoundary), וההתאוששות האוטומטית מחיבור תקוע אחרי דיפלוי
// (useConnectionStatus). מקום אחד כדי ששלושתם יישארו זהים.
export async function clearCacheAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    sessionStorage.clear();
  } catch {
    // ממשיכים לרענן גם אם הניקוי נכשל - עדיף רענון בלי ניקוי מאשר להישאר תקוע
  }
  window.location.href = '/?t=' + Date.now();
}
