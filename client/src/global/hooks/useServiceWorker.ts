import { useEffect } from 'react';
import { diagLog } from '../helpers/crashLog';

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

    diagLog('sw', 'manual register() starting');
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { type: 'module' })
      .then((reg) => {
        registration = reg;
        diagLog('sw', `registered scope=${reg.scope} active=${!!reg.active} installing=${!!reg.installing} waiting=${!!reg.waiting}`);
      })
      .catch((error) => {
        diagLog('sw', `registration error: ${String(error)}`);
      });

    // לוג של כל controllerchange - זה בדיוק האירוע שה-registerSW האוטומטי
    // (workbox-window) היה מגיב אליו עם reload כפוי לפני שעברנו לרישום ידני
    // (ראו ההערה למעלה). אם עדיין קורה כאן reload כלשהו מיד אחרי זה, זה
    // הראיה שמשהו אחר גורם לו - לא הספרייה.
    const handleControllerChange = () => {
      diagLog('sw', 'controllerchange fired (SW took control of this page)');
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // בדיקת עדכון יזומה כשחוזרים לטאב - הבדיקה התקופתית המובנית של
    // vite-plugin-pwa לא בהכרח מספיק תכופה למשתמש שמשאיר את האפליקציה
    // פתוחה זמן רב ברקע. בלי זה, גרסה חדשה (כולל תיקוני באגים) יכולה
    // לחכות שעה+ עד שהטאב הפתוח בכלל שם לב שיש עדכון.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        diagLog('sw', 'tab visible, checking for update');
        registration?.update()
          .then(() => diagLog('sw', 'update() check completed'))
          .catch((err) => diagLog('sw', `update() check failed (non-fatal): ${String(err)}`));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);
}
