import apiClient from './client';

export interface InsightsData {
  topProducts: { name: string; count: number; category: string }[];
  categoryBreakdown: { category: string; count: number; percentage: number }[];
  stats: {
    totalProducts: number;
    totalPurchased: number;
    totalLists: number;
    avgProductsPerList: number;
    mostActiveDay: string;
    completionRate: number;
  };
  forgotten: { name: string; lastSeen: string; category: string }[];
  shoppingFrequency: {
    avgDaysBetween: number;
    lastShoppingDate: string | null;
    predictedNextDate: string | null;
  };
  smartTips: string[];
  hourlyActivity: number[];
  weekdayActivity: number[];
  shoppingScore: number;
  shoppingPersonality: { type: string; emoji: string; description: string };
  streaks: { currentWeeks: number; longestWeeks: number };
  monthComparison: { productsGrowth: number; completionGrowth: number; previousTotal: number };
  weeklyTrends: { week: string; added: number; purchased: number }[];
  groupStats: {
    name: string;
    icon: string;
    membersCount: number;
    topContributor: { name: string; count: number } | null;
    topBuyer: { name: string; count: number } | null;
    memberBreakdown: { name: string; added: number; purchased: number }[];
  }[];
}

// השוואת מחירים הועברה למודול נפרד: src/features/priceComparison

export const insightsApi = {
  async getInsights(): Promise<InsightsData> {
    const response = await apiClient.get<{ data: InsightsData }>('/insights');
    return response.data.data;
  },
};
