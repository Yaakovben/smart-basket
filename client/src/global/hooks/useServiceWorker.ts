import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

const CACHE_CLEARED_KEY = 'sb_cache_cleared_v1';

/**
 * Clear all caches from previous versions (runs only once).
 * This is needed because we removed caching but old users still have cached files.
 */
async function clearAllCachesOnce(): Promise<void> {
  // Skip if already cleared
  if (localStorage.getItem(CACHE_CLEARED_KEY)) {
    return;
  }

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

  // Mark as cleared so we don't run again
  localStorage.setItem(CACHE_CLEARED_KEY, '1');
}

/**
 * Minimal service worker registration for PWA support.
 * No caching - the SW is only needed for "Add to Home Screen" functionality.
 */
export function useServiceWorker(): void {
  useEffect(() => {
    // Clear old caches once (for users who had previous cached version)
    clearAllCachesOnce();

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
