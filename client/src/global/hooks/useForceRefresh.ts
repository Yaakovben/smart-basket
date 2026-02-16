import { useEffect } from 'react';
import { socketService } from '../../services/socket';

/**
 * Listens for admin-triggered force-refresh events via socket.
 * When received, clears all caches, unregisters service workers,
 * and reloads the page — no user action needed.
 */
export function useForceRefresh(): void {
  useEffect(() => {
    const unsubscribe = socketService.on('force-refresh', async () => {
      try {
        // 1. Unregister all service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }

        // 2. Clear all browser caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        // 3. Clear sessionStorage (keep localStorage for auth tokens)
        sessionStorage.clear();

        // 4. Reset cache version flag so App.tsx re-clears on next load
        localStorage.removeItem('cache_cleared');

        // 5. Force reload from server (bypass any remaining cache)
        window.location.href = '/?t=' + Date.now();
      } catch {
        // If something fails, just force reload
        window.location.reload();
      }
    });

    return unsubscribe;
  }, []);
}
