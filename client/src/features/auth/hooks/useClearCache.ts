import { useState, useCallback } from 'react';

// ניקוי מטמון מלא ישירות, ללא ניווט לדף נפרד - שימור טוקנים כדי לא להתנתק
export const useClearCache = () => {
  const [clearing, setClearing] = useState(false);

  const handleClearCache = useCallback(async () => {
    setClearing(true);
    try {
      // ביטול רישום Service Workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      // ניקוי Cache API
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      // ניקוי localStorage (שימור טוקנים)
      const access = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      localStorage.clear();
      if (access) localStorage.setItem('accessToken', access);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      // ניקוי sessionStorage
      sessionStorage.clear();
      // ניקוי IndexedDB
      if ('indexedDB' in window && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        dbs.forEach(db => { if (db.name) indexedDB.deleteDatabase(db.name); });
      }
      // ריענון כפוי
      window.location.href = '/?t=' + Date.now();
    } catch {
      // במקרה של שגיאה, ניווט לדף סטטי כגיבוי
      window.location.href = '/clear.html';
    }
  }, []);

  return { clearing, handleClearCache };
};
