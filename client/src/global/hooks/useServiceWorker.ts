import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Minimal service worker registration for PWA support.
 * No caching - the SW is only needed for push notifications and "Add to Home Screen".
 * Cache clearing is handled in App.tsx on module load.
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
