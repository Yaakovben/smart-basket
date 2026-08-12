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
  // hasBaseline=false משמעו שאין נתוני חודש קודם להשוות אליו - הצרכן יציג "—"
  // במקום "0%" כדי לא לבלבל בין "אין שינוי" ל"אין בסיס".
  monthComparison: { productsGrowth: number; completionGrowth: number; previousTotal: number; hasBaseline: boolean };
  weeklyTrends: { week: string; added: number; purchased: number }[];
  groupStats: {
    name: string;
    icon: string;
    membersCount: number;
    topContributor: { name: string; count: number } | null;
    topBuyer: { name: string; count: number } | null;
    memberBreakdown: { name: string; added: number; purchased: number }[];
    userContribution: {
      added: number;
      purchased: number;
      vsAvgAddedPct: number;
      vsAvgPurchasedPct: number;
      rankAdded: number;
    } | null;
  }[];
  categoryCycles: { category: string; avgDays: number; lastPurchased: string; samples: number }[];
  upcomingNeeds: { category: string; daysOverdue: number; nextDateISO: string }[];
  anomalies: { type: 'returning' | 'fading' | 'surge'; category: string; description: string }[];
  spending: {
    enabled: boolean;
    monthTotal: number | null;
    monthMatchedCount: number;
    monthUnmatchedCount: number;
    projectedMonthTotal: number | null;
    daysElapsed: number;
    daysInMonth: number;
    topCategory: { category: string; amount: number; percentage: number } | null;
    categoryBreakdown: { category: string; amount: number; percentage: number }[];
    // פילוח הוצאה לפי רשימה - כמה הוצאת מכל רשימה החודש
    listBreakdown: { listId: string; name: string; icon: string; amount: number; percentage: number }[];
    previousMonthTotal: number | null;
    monthGrowthPct: number | null;
    hasBaseline: boolean;
    disclaimer: string;
  };
}
