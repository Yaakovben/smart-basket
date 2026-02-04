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

export const pushApi = {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  getPushStatus,
};
