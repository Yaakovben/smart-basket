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

/** בדיקה אם האפליקציה רצה כ-PWA מותקן */
function checkPwaInstalled(): boolean {
  // מצב standalone ב iOS Safari
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) {
    return true;
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }
  return false;
}

/** המרת מחרוזת base64 ל-Uint8Array עבור מפתח VAPID */
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

// מצב הרשמה משותף בין כל מופעי ה-hook (כשדף Settings מחליף, גם ה-router מתעדכן)
const subscriptionListeners = new Set<(subscribed: boolean) => void>();
function notifySubscriptionChange(subscribed: boolean) {
  subscriptionListeners.forEach(fn => fn(subscribed));
}

/** ניהול התראות push */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // סנכרון מצב הרשמה בין כל מופעי ה-hook
  useEffect(() => {
    const listener = (subscribed: boolean) => setIsSubscribed(subscribed);
    subscriptionListeners.add(listener);
    return () => { subscriptionListeners.delete(listener); };
  }, []);

  // בדיקת תמיכה בהתראות push
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator &&
                       'PushManager' in window &&
                       'Notification' in window;

      setIsSupported(supported);
      setIsPwaInstalled(checkPwaInstalled());

      if (!supported) {
        setLoading(false);
        return;
      }

      setPermission(Notification.permission);

      // בדיקה אם כבר רשום (עם timeout למניעת תקיעה אם SW לא נטען)
      try {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 10000)),
        ]);
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

  // בדיקה מחדש של הרשאת התראות כשהמשתמש חוזר לאפליקציה (ייתכן ששינה בהגדרות)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  /** הרשמה להתראות push */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('NOT_SUPPORTED');
      return false;
    }

    if (!checkPwaInstalled()) {
      setError('PWA_NOT_INSTALLED');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('PERMISSION_DENIED');
        setLoading(false);
        return false;
      }

      const vapidPublicKey = await pushApi.getVapidPublicKey();
      if (!vapidPublicKey) {
        setError('NOT_CONFIGURED');
        setLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // ביטול subscription קיים (אם יש) למניעת conflict עם VAPID key ישן
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      let subscription: PushSubscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
      } catch {
        setError('SUBSCRIBE_FAILED');
        setLoading(false);
        return false;
      }

      const success = await pushApi.subscribeToPush(subscription);

      if (success) {
        setIsSubscribed(true);
        notifySubscriptionChange(true);
        setError(null);
      } else {
        setError('SAVE_FAILED');
      }

      setLoading(false);
      return success;
    } catch (err) {
      if (import.meta.env.DEV) console.error('Push subscribe error:', err);
      setError('UNKNOWN');
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  /** ביטול הרשמה מהתראות push */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await pushApi.unsubscribeFromPush(subscription.endpoint);
      }

      setIsSubscribed(false);
      notifySubscriptionChange(false);
      setLoading(false);
      return true;
    } catch {
      setError('UNKNOWN');
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
