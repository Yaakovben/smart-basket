import apiClient from './client';

interface VapidKeyResponse {
  publicKey: string;
}

/** קבלת מפתח VAPID ציבורי */
const getVapidPublicKey = async (): Promise<string | null> => {
  try {
    const response = await apiClient.get<{ data: VapidKeyResponse }>('/push/vapid-public-key');
    return response.data.data.publicKey;
  } catch {
    return null;
  }
};

/** הרשמה להתראות push */
const subscribeToPush = async (subscription: PushSubscription): Promise<boolean> => {
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
const unsubscribeFromPush = async (endpoint?: string): Promise<boolean> => {
  try {
    await apiClient.post('/push/unsubscribe', { endpoint });
    return true;
  } catch {
    return false;
  }
};

/** ביטול כל ההרשמות ל-push (דפדפן + שרת). משמש ב-logout. */
const unsubscribeAllPush = async (): Promise<void> => {
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

export interface UserDeliveryStatus {
  userId: string;
  name: string;
  status: 'delivered' | 'failed' | 'no_subscription';
  delivered: number;
  failed: number;
}

export interface BroadcastPushResult {
  totalUsers: number;
  usersWithPush: number;
  usersWithoutPush: number;
  delivered: number;
  failed: number;
  perUser: UserDeliveryStatus[];
}

/** שליחת הודעת push לכל המשתמשים - אדמין בלבד. מחזיר פירוט מסירה מלא (כולל כמה משתמשים בלי פוש בכלל). */
const broadcastPush = async (title: string, body: string, url?: string): Promise<BroadcastPushResult> => {
  const response = await apiClient.post<{ data: BroadcastPushResult }>('/push/broadcast', { title, body, url });
  return response.data.data;
};

export interface SendPushResult {
  hasSubscription: boolean;
  delivered: number;
  failed: number;
}

/** שליחת הודעת push למשתמש ספציפי אחד - אדמין בלבד. מחזיר סטטוס מסירה מפורט. */
const sendPushToUser = async (userId: string, title: string, body: string, url?: string): Promise<SendPushResult> => {
  const response = await apiClient.post<{ data: SendPushResult }>('/push/send-to-user', { userId, title, body, url });
  return response.data.data;
};

export const pushApi = {
  getVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
  unsubscribeAllPush,
  broadcastPush,
  sendPushToUser,
};
