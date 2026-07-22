import type { SpendingData } from './spending.service';

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
  // hasBaseline=false משמעו שאין נתוני חודש קודם כלל - הצרכן יציג "—" במקום "0%",
  // כדי לא לבלבל בין "אין שינוי" ל"אין בסיס להשוואה".
  monthComparison: { productsGrowth: number; completionGrowth: number; previousTotal: number; hasBaseline: boolean };
  weeklyTrends: { week: string; added: number; purchased: number }[];
  groupStats: {
    name: string;
    icon: string;
    membersCount: number;
    topContributor: { name: string; count: number } | null;
    topBuyer: { name: string; count: number } | null;
    memberBreakdown: { name: string; added: number; purchased: number }[];
    // התרומה של המשתמש הנוכחי בקבוצה לעומת הממוצע של החברים האחרים.
    // pct=100 = ממוצע, pct=200 = פי-2 מהממוצע, pct=0 = לא תורם בכלל.
    userContribution: {
      added: number;
      purchased: number;
      vsAvgAddedPct: number;
      vsAvgPurchasedPct: number;
      rankAdded: number; // המקום של המשתמש מבין החברים (1=ראשון)
    } | null;
  }[];
  // מחזורי קטגוריה - כל כמה ימים המשתמש קונה מקטגוריה מסוימת.
  // מחושב מהממוצע בין רכישות חוזרות באותה קטגוריה.
  categoryCycles: { category: string; avgDays: number; lastPurchased: string; samples: number }[];
  // קטגוריות שצפויות עכשיו - מבוסס על המחזור + הרכישה האחרונה.
  // daysOverdue<=0 = עוד לא הגיע הזמן, daysOverdue>0 = עבר הזמן הצפוי.
  upcomingNeeds: { category: string; daysOverdue: number; nextDateISO: string }[];
  // אנומליות - שינויים פתאומיים בהרגלי הקנייה.
  anomalies: { type: 'returning' | 'fading' | 'surge'; category: string; description: string }[];
  // הוצאה חודשית משוערת - מבוסס על התאמת מוצרים שנקנו למאגר המחירים הממשלתי.
  spending: SpendingData;
}
