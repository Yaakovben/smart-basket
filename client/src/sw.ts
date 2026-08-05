/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { getNotifSettingsFromIDB, getSettingsKeyForType } from './settingsIDB';

declare let self: ServiceWorkerGlobalScope;

// שמירת כל נכסי ה-build במטמון (JS, CSS, HTML, תמונות)
precacheAndRoute(self.__WB_MANIFEST);

// SPA: כל בקשות ניווט (כתובות שאינן קבצים סטטיים) מוגשות מה-cache של index.html,
// כך שהאפליקציה נטענת גם ללא רשת
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

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
