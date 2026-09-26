import apiClient from './client';

export type SubscriptionRequestStatus = 'pending' | 'reported' | 'approved' | 'rejected' | 'cancelled';
export type SubscriptionPayMethod = 'bit' | 'paybox' | 'bank';

export interface SubscriptionRequestDto {
  id: string;
  months: number;
  amount: number;
  currency: string;
  method: SubscriptionPayMethod;
  reference: string;
  status: SubscriptionRequestStatus;
  createdAt: string;
  reportedAt: string | null;
  resolvedAt: string | null;
  adminNote: string | null;
}

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
  catalog: {
    currency: string;
    monthly: number;
    yearly: number | null;
    yearlySavingsPercent: number | null;
    allowedMonths: number[];
  };
  payment: {
    bit: { url: string } | null;
    paybox: { url: string } | null;
    bank: { bankName: string; branch: string; account: string } | null;
    supportEmail: string;
  };
  store: {
    enabled: boolean;
    entitlementId: string;
    appUserId: string;
    isStorePlan: boolean;
    autoRenew: boolean;
  };
  openRequest: SubscriptionRequestDto | null;
  history: SubscriptionRequestDto[];
}

export const subscriptionApi = {
  async getStatus(): Promise<SubscriptionStatus> {
    const res = await apiClient.get<{ data: SubscriptionStatus }>('/subscription');
    return res.data.data;
  },

  async createRequest(months: number, method: SubscriptionPayMethod): Promise<SubscriptionRequestDto> {
    const res = await apiClient.post<{ data: SubscriptionRequestDto }>('/subscription/requests', { months, method });
    return res.data.data;
  },

  async reportPaid(id: string): Promise<SubscriptionRequestDto> {
    const res = await apiClient.post<{ data: SubscriptionRequestDto }>(`/subscription/requests/${id}/paid`);
    return res.data.data;
  },

  // אחרי רכישה/שחזור באפליקציה: השרת בודק מול RevenueCat ומפעיל את המנוי.
  async syncStore(): Promise<{ active: boolean; expiresAt: string | null }> {
    const res = await apiClient.post<{ data: { active: boolean; expiresAt: string | null } }>('/store-billing/sync');
    return res.data.data;
  },

  async cancelRequest(id: string): Promise<void> {
    await apiClient.delete(`/subscription/requests/${id}`);
  },
};
