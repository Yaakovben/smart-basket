import apiClient from './client';

export interface SubscriptionStatus {
  plan: 'free' | 'pro';
  planExpiresAt: string | null;
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
  priceMonthly: number;
  currency: string;
}

export const subscriptionApi = {
  async getStatus(): Promise<SubscriptionStatus> {
    const res = await apiClient.get<{ data: SubscriptionStatus }>('/subscription');
    return res.data.data;
  },

  async cancel(): Promise<void> {
    await apiClient.delete('/subscription');
  },
};
