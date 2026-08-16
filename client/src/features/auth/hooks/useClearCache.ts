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
      // שימור טוקנים - לא רוצים שניקוי מטמון יגרום גם להתנתקות
      const access = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');
      localStorage.clear();
      if (access) localStorage.setItem('accessToken', access);
      if (refresh) localStorage.setItem('refreshToken', refresh);
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
