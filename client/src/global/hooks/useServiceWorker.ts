import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Clear all caches from previous versions.
 * This is needed because we removed caching but old users still have cached files.
 */
async function clearAllCaches(): Promise<void> {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    } catch {
      // Ignore errors - cache clearing is best-effort
    }
  }
}

/**
 * Minimal service worker registration for PWA support.
 * No caching - the SW is only needed for "Add to Home Screen" functionality.
 */
export function useServiceWorker(): void {
  useEffect(() => {
    // Clear old caches first
    clearAllCaches();

    registerSW({
      immediate: true,
      onRegisterError(error) {
        if (import.meta.env.DEV) {
          console.error('SW registration error:', error);
        }
      },
    });
  }, []);
}
