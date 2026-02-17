import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** רישום Service Worker מינימלי - נדרש רק עבור התראות push והוספה למסך הבית */
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
