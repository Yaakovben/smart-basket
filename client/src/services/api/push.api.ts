import apiClient from './client';

interface VapidKeyResponse {
  publicKey: string;
}

/** קבלת מפתח VAPID ציבורי */
export const getVapidPublicKey = async (): Promise<string | null> => {
  try {
    const response = await apiClient.get<{ data: VapidKeyResponse }>('/push/vapid-public-key');
    return response.data.data.publicKey;
  } catch {
    return null;
  }
};

/** הרשמה להתראות push */
export const subscribeToPush = async (subscription: PushSubscription): Promise<boolean> => {
  try {
    await apiClient.post('/push/subscribe', {
      subscription: subscription.toJSON(),
    });
    return true;
  } catch {
    return false;
  }
};

/** ביטול הרשמה להתראות push */
export const unsubscribeFromPush = async (endpoint?: string): Promise<boolean> => {
  try {
    await apiClient.post('/push/unsubscribe', { endpoint });
    return true;
  } catch {
    return false;
  }
};

/** ביטול כל ההרשמות ל-push (דפדפן + שרת). משמש ב-logout. */
export const unsubscribeAllPush = async (): Promise<void> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await unsubscribeFromPush(subscription.endpoint);
    }
  } catch {
    // לא לזרוק - logout צריך להמשיך גם אם ביטול push נכשל
  }
};

export const pushApi = {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  unsubscribeAllPush,
};
