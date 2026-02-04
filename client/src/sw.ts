/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// Precache assets (injected by VitePWA)
precacheAndRoute(self.__WB_MANIFEST);

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    // Extended notification options (some properties are non-standard but widely supported)
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-72.png',
      tag: data.data?.listId || 'smart-basket',
      renotify: true,
      data: data.data,
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Smart Basket', options)
    );
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

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
