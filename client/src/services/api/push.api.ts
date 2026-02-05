import apiClient from './client';

interface VapidKeyResponse {
  publicKey: string;
}

interface PushStatusResponse {
  subscribed: boolean;
}

/**
 * Get VAPID public key for push subscription
 */
export const getVapidPublicKey = async (): Promise<string | null> => {
  try {
    const response = await apiClient.get<{ data: VapidKeyResponse }>('/push/vapid-public-key');
    return response.data.data.publicKey;
  } catch {
    return null;
  }
};

/**
 * Subscribe to push notifications
 */
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

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (endpoint?: string): Promise<boolean> => {
  try {
    await apiClient.post('/push/unsubscribe', { endpoint });
    return true;
  } catch {
    return false;
  }
};

/**
 * Get push subscription status
 */
export const getPushStatus = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get<{ data: PushStatusResponse }>('/push/status');
    return response.data.data.subscribed;
  } catch {
    return false;
  }
};

/**
 * Unsubscribe from all push notifications (browser + server)
 * Used during logout to stop receiving notifications
 */
export const unsubscribeAllPush = async (): Promise<void> => {
  try {
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Get current subscription from browser
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe locally from browser
      await subscription.unsubscribe();

      // Remove from server
      await unsubscribeFromPush(subscription.endpoint);
    }
  } catch {
    // Don't throw - logout should continue even if push unsubscribe fails
  }
};

export const pushApi = {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  unsubscribeAllPush,
  getPushStatus,
};
