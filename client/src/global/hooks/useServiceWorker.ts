import { useEffect, useState, useCallback, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface UseServiceWorkerReturn {
  needRefresh: boolean;
  updateServiceWorker: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // New content available - show update banner, don't auto-reload
        setNeedRefresh(true);
      },
      onOfflineReady() {
        console.log('App ready for offline use');
      },
      onRegisteredSW(swUrl, registration) {
        // Check for updates frequently (every 5 minutes) for faster update delivery
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 5 * 60 * 1000);
          // Also check immediately on visibility change (user returns to app)
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update();
            }
          });
        }
        console.log('SW registered:', swUrl);
      },
      onRegisterError(error) {
        console.error('SW registration error:', error);
      },
    });

    updateSWRef.current = updateSW;
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (updateSWRef.current) {
      updateSWRef.current(true);
    }
  }, []);

  return {
    needRefresh,
    updateServiceWorker,
  };
}
