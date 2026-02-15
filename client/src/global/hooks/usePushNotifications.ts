import { useState, useEffect, useCallback } from 'react';
import { pushApi } from '../../services/api';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isPwaInstalled: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

/**
 * Check if the app is running as an installed PWA (added to home screen)
 */
function checkPwaInstalled(): boolean {
  // iOS Safari standalone mode
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) {
    return true;
  }
  // Standard display-mode: standalone (Android Chrome, Desktop)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // display-mode: fullscreen (some PWAs)
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }
  return false;
}

/**
 * Convert base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Shared subscription state across all hook instances.
// When Settings page toggles push, the router's instance also updates.
const subscriptionListeners = new Set<(subscribed: boolean) => void>();
function notifySubscriptionChange(subscribed: boolean) {
  subscriptionListeners.forEach(fn => fn(subscribed));
}

/**
 * Hook for managing push notifications
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync subscription state across all hook instances
  useEffect(() => {
    const listener = (subscribed: boolean) => setIsSubscribed(subscribed);
    subscriptionListeners.add(listener);
    return () => { subscriptionListeners.delete(listener); };
  }, []);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      // Check browser support
      const supported = 'serviceWorker' in navigator &&
                       'PushManager' in window &&
                       'Notification' in window;

      setIsSupported(supported);
      setIsPwaInstalled(checkPwaInstalled());

      if (!supported) {
        setLoading(false);
        return;
      }

      // Get current permission
      setPermission(Notification.permission);

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const subscribed = !!subscription;
        setIsSubscribed(subscribed);
        notifySubscriptionChange(subscribed);
      } catch {
        setIsSubscribed(false);
      }

      setLoading(false);
    };

    checkSupport();
  }, []);

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push not supported in this browser');
      return false;
    }

    if (!checkPwaInstalled()) {
      setError('PWA not installed');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Permission denied');
        setLoading(false);
        return false;
      }

      // Get VAPID public key from server
      const vapidPublicKey = await pushApi.getVapidPublicKey();
      if (!vapidPublicKey) {
        setError('Push notifications not configured on server');
        setLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Send subscription to server
      const success = await pushApi.subscribeToPush(subscription);

      if (success) {
        setIsSubscribed(true);
        notifySubscriptionChange(true);
        setError(null);
      } else {
        setError('Failed to save subscription to server');
      }

      setLoading(false);
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setLoading(true);
    setError(null);

    try {
      // Get current subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe locally
        await subscription.unsubscribe();

        // Remove from server
        await pushApi.unsubscribeFromPush(subscription.endpoint);
      }

      setIsSubscribed(false);
      notifySubscriptionChange(false);
      setLoading(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    isPwaInstalled,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
  };
}
