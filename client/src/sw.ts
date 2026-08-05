/// <reference lib="webworker" />
import { precacheAndRoute, matchPrecache } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { getNotifSettingsFromIDB, getSettingsKeyForType } from './settingsIDB';

declare let self: ServiceWorkerGlobalScope;

// שמירת כל נכסי ה-build במטמון (JS, CSS, HTML, תמונות). לקבצים עם content-hash
// בשם (JS/CSS - index-XXXXX.js) cache-first תמיד נכון: build חדש = שם קובץ חדש,
// אין סיכון staleness.
precacheAndRoute(self.__WB_MANIFEST);

// SPA: ניווט (פתיחת/סגירת-ופתיחת-מחדש האפליקציה) מנסה תמיד רשת טרייה קודם.
//
// לפני התיקון, createHandlerBoundToURL('/index.html') הגיש cache-only -
// ה-SW *הזה* (כל עוד הוא ה-SW הפעיל במכשיר) המשיך להגיש את ה-index.html
// שהוא שמר בזמן ההתקנה שלו, לנצח, בלי שום קשר למה שבאמת פרוס בשרת - וזה
// ביטל לגמרי את ה-Cache-Control: no-cache על index.html (vercel.json):
// הדפדפן אף פעם לא הגיע ל-HTTP fetch אמיתי, כי ה-navigation route ענה
// ישירות מה-cache. זה ההסבר לכך שתיקוני קוד שכבר פרוסים בשרת "לא הגיעו"
// למכשיר - ה-SW הישן על המכשיר פשוט המשיך להגיש גרסה ישנה של index.html
// (כולל bundle JS ישן) עד שה-SW עצמו יוחלף - תהליך שדבר לא היה מכריח.
//
// עכשיו: תמיד fetch מהרשת קודם (מקבל index.html עדכני שמצביע ל-bundle
// העדכני בפועל), ורק אם באמת אין רשת נופלים לגרסה ששמורה ב-precache
// מבנייה זו - עדיין תומך בפתיחה אופליין.
registerRoute(new NavigationRoute(async ({ request }) => {
  try {
    return await fetch(request);
  } catch {
    const cached = await matchPrecache('/index.html');
    if (cached) return cached;
    throw new Error('offline and no precached index.html available');
  }
}));

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

// התקנה, דילוג על המתנה להפעלה מיידית
self.addEventListener('install', () => {
  console.log('[sw] install event, calling skipWaiting()');
  self.skipWaiting();
});

// הפעלה - תופס שליטה על הטאבים הפתוחים ומודיע ללקוחות (לא מרענן יותר -
// ה-listener ב-router/index.tsx רק מתעד, ראה הערה שם).
// לא מוחק caches בקפדנות: עם injectManifest + globPatterns ריק אין cache של אפליקציה,
// רק של workbox. מחיקה אגרסיבית בזמן activate שולחת את ה-PWA למצב לא עקבי אחרי deploy.
self.addEventListener('activate', (event) => {
  console.log('[sw] activate event, calling clients.claim()');
  event.waitUntil(
    self.clients.claim().then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    ).then((clients) => {
      console.log(`[sw] claimed, notifying ${clients.length} client(s)`);
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', action: 'reload' });
      });
    })
  );
});
