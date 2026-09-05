/// <reference lib="webworker" />
import { getNotifSettingsFromIDB, getSettingsKeyForType } from './settingsIDB';

// __WB_MANIFEST: הטיפוס הגיע בעבר דרך ה-import מ-workbox-precaching (הוסר
// יחד עם ה-precaching עצמו). injectManifest עדיין דורש שהמזהה הזה יופיע
// בקוד כדי להזריק לתוכו את הרשימה (ריקה, ראו globPatterns: [] ב-vite.config.ts) -
// מצהירים עליו ידנית כדי ש-tsc לא ייכשל.
declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown };

// אין שום caching בכוונה - לא assets, לא index.html, כלום. כל בקשה (כולל
// ניווט) עוברת ישר לרשת, בדיוק כמו בלי Service Worker בכלל מבחינת caching.
//
// זה היה מקור לבאג חמור וממושך: SW שכבר מותקן במכשיר המשיך להגיש
// index.html/JS ישנים מה-precache הפנימי שלו *לנצח*, בלי שום קשר למה שבאמת
// פרוס בשרת - Cache-Control: no-cache (vercel.json) לא נבדק בכלל כי הדפדפן
// לא הגיע ל-HTTP fetch אמיתי (ה-navigation route ענה ישירות מה-cache).
// משתמשים שראו תיקונים "לא מגיעים" בפועל היו תקועים על SW ישן שהתקין
// עצמו פעם אחת ולא היה שום דבר שמכריח אותו להתעדכן.
//
// ה-SW הזה עדיין רשום ופעיל *רק* כי iOS/Android דורשים Service Worker
// פעיל כדי לקבל Push notifications בכלל (ראו self.addEventListener('push')
// למטה) - זו הסיבה היחידה שהוא עדיין קיים. self.__WB_MANIFEST מוזרק כאן
// ריק (globPatterns: [] ב-vite.config.ts) - injectManifest (הכלי שבונה את
// הקובץ הזה) מחייב שה-placeholder הזה יופיע בקוד, גם אם לא עושים איתו כלום.
// console.log (לא void) - חייב side effect אמיתי, אחרת esbuild/rollup
// מזהים את הביטוי כ"מת" (אין לו תוצאה בשום מקום) ומסלקים אותו לגמרי
// מה-bundle לפני ש-injectManifest סורק את הפלט המבונה ומחפש את המחרוזת
// המילולית self.__WB_MANIFEST - ואז ה-build כולו נכשל.
console.log('[sw] manifest entries:', self.__WB_MANIFEST);

// טיפול בהתראות נכנסות, סינון לפי העדפות המשתמש
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const showNotification = async () => {
      // קריאת הגדרות התראות מהמסד המקומי
      const settings = await getNotifSettingsFromIDB();

      if (settings) {
        // מתג ראשי, חסימת כל ההתראות
        if (!settings.enabled) return;

        const notifType = data.data?.type as string | undefined;
        const listId = data.data?.listId as string | undefined;

        // בדיקה אם סוג ההתראה הזה מכובה
        if (notifType) {
          const settingsKey = getSettingsKeyForType(notifType);
          if (settingsKey && settingsKey !== 'enabled' && settingsKey !== 'mutedGroupIds') {
            if (!(settings[settingsKey] ?? true)) return;
          }
        }

        // בדיקה אם הרשימה מושתקת
        if (listId && settings.mutedGroupIds?.includes(listId)) return;
      }

      // כל הפילטרים עברו, מציגים את ההתראה
      const options = {
        body: data.body,
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/icon-192x192.png',
        tag: data.data?.notificationId || `${data.data?.listId || 'sb'}_${Date.now()}`,
        data: data.data,
        vibrate: [100, 50, 100],
      };

      const title = data.title !== undefined && data.title !== null ? data.title : 'Smart Basket';
      await self.registration.showNotification(title, options);
    };

    event.waitUntil(showNotification());
  } catch (error) {
    console.error('Error showing push notification:', error);
  }
});

// לחיצה על התראה, פתיחת האפליקציה בדף הרלוונטי
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // בדיקה אם כבר יש חלון פתוח
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // שליחת הודעה לאפליקציה לנווט דרך React Router (בלי reload)
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return;
        }
      }
      // פתיחת חלון חדש אם אין אפליקציה פתוחה
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', () => {});

// הודעה מהאפליקציה - נכנסים לרשימה מסוימת (מכרטיס בבית או מהתראה
// בפעמון), סוגרים כל התראת OS ממתינה לאותה רשימה. בלי זה, מספר push
// שהגיעו לאותה רשימה בזמנים שונים (tag שונה לכל אחת, ראו showNotification
// למעלה) נשארים תלויים במגירת ההתראות של המכשיר גם אחרי שכבר נכנסו
// ונקראו בפועל בתוך האפליקציה.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_LIST_NOTIFICATIONS' || !event.data.listId) return;
  const { listId } = event.data;
  event.waitUntil(
    self.registration.getNotifications().then((notifications) => {
      notifications
        .filter((n) => n.data?.listId === listId)
        .forEach((n) => n.close());
    })
  );
});

// התקנה, דילוג על המתנה להפעלה מיידית
self.addEventListener('install', () => {
  console.log('[sw] install event, calling skipWaiting()');
  self.skipWaiting();
});

// הפעלה - מנקה caches שנשארו מגרסה קודמת (זו שכן עשתה precaching - המקור
// לבאג), תופס שליטה על הטאבים הפתוחים, ומודיע ללקוחות (לא מרענן יותר -
// ה-listener ב-router/index.tsx רק מתעד, ראה הערה שם).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log(`[sw] activate: deleted ${cacheNames.length} leftover cache(s) from older SW`);
      } catch (err) {
        console.warn('[sw] activate: cache cleanup failed (non-fatal):', err);
      }
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      console.log(`[sw] claimed, notifying ${clients.length} client(s)`);
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', action: 'reload' });
      });
    })()
  );
});
