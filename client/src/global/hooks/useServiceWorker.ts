import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Minimal service worker registration for PWA support.
 * No caching - the SW is only needed for "Add to Home Screen" functionality.
 */
export function useServiceWorker(): void {
  useEffect(() => {
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
