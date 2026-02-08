/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { getNotifSettingsFromIDB, getSettingsKeyForType } from './settingsIDB';

declare let self: ServiceWorkerGlobalScope;

// VitePWA requires this - globPatterns is empty so nothing is actually cached
precacheAndRoute(self.__WB_MANIFEST);

// Push notification handler — filters based on user notification preferences
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const showNotification = async () => {
      // Read user notification settings from IndexedDB
      const settings = await getNotifSettingsFromIDB();

      if (settings) {
        // Master toggle — block all notifications
        if (!settings.enabled) return;

        const notifType = data.data?.type as string | undefined;
        const listId = data.data?.listId as string | undefined;

        // Check if this notification type is disabled
        if (notifType) {
          const settingsKey = getSettingsKeyForType(notifType);
          if (settingsKey && settingsKey !== 'enabled' && settingsKey !== 'mutedGroupIds') {
            if (!(settings[settingsKey] ?? true)) return;
          }
        }

        // Check if this group is muted
        if (listId && settings.mutedGroupIds?.includes(listId)) return;
      }

      // All filters passed — show the notification
      const options = {
        body: data.body,
        icon: data.icon || '/apple-touch-icon.svg',
        badge: data.badge || '/favicon.svg',
        tag: data.data?.listId || 'smart-basket',
        renotify: true,
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

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // Navigate to the specific list if URL is provided
          if (url && 'navigate' in client) {
            (client as WindowClient).navigate(url);
          }
          return;
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Notification close handler (optional)
self.addEventListener('notificationclose', () => {
  // Analytics or cleanup if needed
});

// Install event - skip waiting to activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate event - clear all caches, notify clients to reload, and claim
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        // Tell all open windows to reload for fresh content
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', action: 'reload' });
        });
      })
      .then(() => self.clients.claim())
  );
});
