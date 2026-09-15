import { useState, useCallback } from 'react';

// ניקוי מטמון מלא ישירות, ללא ניווט לדף נפרד - שימור טוקנים כדי לא להתנתק
export const useClearCache = () => {
  const [clearing, setClearing] = useState(false);

  const handleClearCache = useCallback(async () => {
    setClearing(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      // שימור access token - לא רוצים שניקוי מטמון יגרום גם להתנתקות
      // (refresh token נמצא ב-httpOnly cookie ולא מושפע מ-localStorage.clear)
      const access = localStorage.getItem('accessToken');
      localStorage.clear();
      if (access) localStorage.setItem('accessToken', access);
      sessionStorage.clear();
      if ('indexedDB' in window && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        dbs.forEach(db => { if (db.name) indexedDB.deleteDatabase(db.name); });
      }
      window.location.href = '/?t=' + Date.now();
    } catch {
      // במקרה של שגיאה, ניווט לדף סטטי כגיבוי
      window.location.href = '/clear.html';
    }
  }, []);

  return { clearing, handleClearCache };
};
