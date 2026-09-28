import apiClient from './client';

export interface SubscriptionStatus {
  plan: 'free' | 'pro';
  // null + plan=pro = מנוי קבוע (הוענק ידנית, בלי תפוגה).
  planExpiresAt: string | null;
  // Pro במתנה של הרשמה (פעיל) / ניסיון שהסתיים (חזר לחינמי).
  isTrial: boolean;
  trialEnded: boolean;
  trialMonths: number;
  limits: {
    maxOwnedLists: number;
    maxGroupMembers: number;
    maxAiRequestsPerDay: number;
    maxPriceComparisonsPerDay: number;
  } | null;
  usage: {
    aiToday: number;
    priceToday: number;
  } | null;
  // מקור המנוי הפעיל: חנות, ניסיון במתנה, או מענק ידני. null כשאין Pro.
  planSource: 'store' | 'trial' | 'granted' | null;
  supportEmail: string;
  store: {
    enabled: boolean;
    entitlementId: string;
    appUserId: string;
    isStorePlan: boolean;
    autoRenew: boolean;
  };
}

export const subscriptionApi = {
  async getStatus(): Promise<SubscriptionStatus> {
    const res = await apiClient.get<{ data: SubscriptionStatus }>('/subscription');
    return res.data.data;
  },

  // אחרי רכישה/שחזור באפליקציה: השרת בודק מול RevenueCat ומפעיל את המנוי.
  async syncStore(): Promise<{ active: boolean; expiresAt: string | null }> {
    const res = await apiClient.post<{ data: { active: boolean; expiresAt: string | null } }>('/store-billing/sync');
    return res.data.data;
  },
};
