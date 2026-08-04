import { useEffect } from 'react';

// רישום ידני - לא דרך registerSW/virtual:pwa-register של vite-plugin-pwa.
// ל-registerType: 'autoUpdate' (vite.config.ts) יש התנהגות מקודדת-קשיח
// בספרייה עצמה (register.js: wb.addEventListener('activated', ...
// window.location.reload())) שמריצה רענון כפוי בלתי-מותנה בכל פעם שה-SW
// מופעל כ-"external" - בדיוק התרחיש של פתיחת PWA שהותקנה למסך הבית שניות
// ספורות אחרי שההתקנה (הורדת ה-precache) התחילה בהקשר אחר (הטאב שממנו
// הוסיפו למסך הבית). זו בדיוק ה"קטיעה" שכל שאר התיקונים באזור הזה
// (checkAuth, refreshAccessToken, handleNewVersion) התאספו למנוע - אבל
// אף אחד מהם לא יכול לגעת בקוד הזה כי הוא רץ בתוך הספרייה, לא באפליקציה.
// רישום ידני עוקף אותו לגמרי; freshness של קוד מטופל כבר ע"י handleNewVersion
// (App.tsx) בלי reload כפוי.
export function useServiceWorker(): void {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { type: 'module' })
      .then((reg) => {
        registration = reg;
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error('SW registration error:', error);
        }
      });

    // בדיקת עדכון יזומה כשחוזרים לטאב - הבדיקה התקופתית המובנית של
    // vite-plugin-pwa לא בהכרח מספיק תכופה למשתמש שמשאיר את האפליקציה
    // פתוחה זמן רב ברקע. בלי זה, גרסה חדשה (כולל תיקוני באגים) יכולה
    // לחכות שעה+ עד שהטאב הפתוח בכלל שם לב שיש עדכון.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        registration?.update().catch(() => { /* לא קריטי - ינסה שוב בפעם הבאה */ });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
}
