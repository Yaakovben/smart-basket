import { Product } from '../models';
import { ListDAL } from '../dal';

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

export class InsightsService {
  static async getUserInsights(userId: string): Promise<InsightsData> {
    try {
    // מציאת כל הרשימות של המשתמש
    const lists = await ListDAL.findUserLists(userId);
    const listIds = lists.map(l => l._id);

    if (listIds.length === 0) {
      return this.emptyInsights();
    }

    // שליפה ישירה עם lean לביצועים (analytics בלבד, לא צריך populate)
    const allProducts = await Product.find({ listId: { $in: listIds } }).lean();

    if (allProducts.length === 0) {
      return this.emptyInsights();
    }

    // מוצרים שנקנו (purchased)
    const purchasedProducts = allProducts.filter(p => p.isPurchased);

    // ===== מוצרים נפוצים =====
    const productCounts = new Map<string, { count: number; category: string }>();
    for (const p of allProducts) {
      const key = p.name.toLowerCase().trim();
      const existing = productCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        productCounts.set(key, { count: 1, category: p.category });
      }
    }
    const topProducts = Array.from(productCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([name, data]) => ({ name, count: data.count, category: data.category }));

    // ===== פילוח קטגוריות =====
    const catCounts = new Map<string, number>();
    for (const p of allProducts) {
      catCounts.set(p.category, (catCounts.get(p.category) || 0) + 1);
    }
    const totalForPercentage = allProducts.length;
    const categoryBreakdown = Array.from(catCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalForPercentage) * 100)
      }));

    // ===== יום הכי פעיל =====
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayCounts = new Array(7).fill(0);
    for (const p of allProducts) {
      dayCounts[new Date(p.createdAt).getDay()]++;
    }
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));

    // ===== תדירות קנייה =====
    const dateSet = new Set<string>();
    for (const p of purchasedProducts) dateSet.add(new Date(p.updatedAt).toDateString());
    const purchaseDates = Array.from(dateSet)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let avgDaysBetween = 0;
    if (purchaseDates.length >= 2) {
      const diffs: number[] = [];
      for (let i = 0; i < Math.min(purchaseDates.length - 1, 10); i++) {
        const diff = (new Date(purchaseDates[i]).getTime() - new Date(purchaseDates[i + 1]).getTime()) / (1000 * 60 * 60 * 24);
        diffs.push(diff);
      }
      avgDaysBetween = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    }

    // ===== מוצרים שאולי שכחת =====
    // מוצרים שהופיעו ביותר מרשימה אחת אבל לא ברשימות הפעילות
    // מיפוי חד-פעמי: רשימות עם מוצרים שלא נקנו
    const listsWithPending = new Set<string>();
    for (const p of allProducts) {
      if (!p.isPurchased) listsWithPending.add(p.listId.toString());
    }
    const activeListIds = listsWithPending;

    const recentProductNames = new Set(
      allProducts
        .filter(p => activeListIds.has(p.listId.toString()))
        .map(p => p.name.toLowerCase().trim())
    );

    const oldProducts = new Map<string, { lastSeen: Date; category: string; count: number }>();
    for (const p of allProducts) {
      const key = p.name.toLowerCase().trim();
      if (recentProductNames.has(key)) continue;
      const existing = oldProducts.get(key);
      if (!existing) {
        oldProducts.set(key, { lastSeen: p.createdAt, category: p.category, count: 1 });
      } else {
        existing.count++;
        if (p.createdAt > existing.lastSeen) existing.lastSeen = p.createdAt;
      }
    }

    const forgotten = Array.from(oldProducts.entries())
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        lastSeen: data.lastSeen.toISOString(),
        category: data.category,
      }));

    // ===== פעילות לפי שעה =====
    const hourlyActivity = new Array(24).fill(0);
    for (const p of allProducts) {
      hourlyActivity[new Date(p.createdAt).getHours()]++;
    }

    // ===== אחוז השלמה =====
    const completionRate = allProducts.length > 0
      ? Math.round((purchasedProducts.length / allProducts.length) * 100)
      : 0;

    // ===== ציון קנייה (0-100) =====
    let score = 50;
    if (completionRate > 80) score += 15;
    else if (completionRate > 50) score += 8;
    if (avgDaysBetween > 0 && avgDaysBetween <= 7) score += 10;
    if (topProducts.length >= 5) score += 5;
    if (categoryBreakdown.length >= 4) score += 10;
    if (forgotten.length === 0) score += 10;
    score = Math.min(100, Math.max(0, score));

    // ===== תובנות חכמות =====
    const smartTips: string[] = [];
    if (topProducts.length > 0) {
      smartTips.push(`המוצר הנפוץ שלך הוא "${topProducts[0].name}" (${topProducts[0].count} פעמים)`);
    }
    if (categoryBreakdown.length > 0) {
      smartTips.push(`הקטגוריה הדומיננטית: ${categoryBreakdown[0].category} (${categoryBreakdown[0].percentage}%)`);
    }
    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    if (hourlyActivity[peakHour] > 0) {
      smartTips.push(`השעה הכי פעילה שלך: ${peakHour}:00`);
    }
    if (avgDaysBetween > 0) {
      smartTips.push(`קצב קנייה ממוצע: כל ${avgDaysBetween} ימים`);
    }
    if (completionRate < 50) {
      smartTips.push('טיפ: נסה לסיים יותר מוצרים מהרשימה לפני שמתחיל חדשה');
    }
    if (forgotten.length > 0) {
      smartTips.push(`${forgotten.length} מוצרים שהפסקת לקנות, אולי שכחת?`);
    }

    return {
      topProducts,
      categoryBreakdown,
      stats: {
        totalProducts: allProducts.length,
        totalPurchased: purchasedProducts.length,
        totalLists: lists.length,
        avgProductsPerList: Math.round(allProducts.length / lists.length),
        mostActiveDay: dayNames[maxDayIdx],
        completionRate,
      },
      forgotten,
      shoppingFrequency: {
        avgDaysBetween,
        lastShoppingDate: purchaseDates[0] ? new Date(purchaseDates[0]).toISOString() : null,
      },
      smartTips,
      hourlyActivity,
      shoppingScore: score,
      groupStats: await this.getGroupStats(lists, userId),
    };
    } catch {
      return this.emptyInsights();
    }
  }

  private static emptyInsights(): InsightsData {
    return {
      topProducts: [],
      categoryBreakdown: [],
      stats: { totalProducts: 0, totalPurchased: 0, totalLists: 0, avgProductsPerList: 0, mostActiveDay: '', completionRate: 0 },
      forgotten: [],
      shoppingFrequency: { avgDaysBetween: 0, lastShoppingDate: null },
      smartTips: [],
      hourlyActivity: new Array(24).fill(0),
      shoppingScore: 0,
      groupStats: [],
    };
  }

  private static async getGroupStats(lists: { _id: any; name: string; icon: string; isGroup: boolean; owner: any; members: { user: any }[] }[], _userId: string): Promise<InsightsData['groupStats']> {
    const groupLists = lists.filter(l => l.isGroup && l.members.length > 0);
    if (groupLists.length === 0) return [];

    const results: InsightsData['groupStats'] = [];

    for (const list of groupLists.slice(0, 5)) {
      const products = await Product.find({ listId: list._id })
        .populate('addedBy', 'name')
        .lean();

      if (products.length === 0) continue;

      // ספירה לפי משתמש: מי הוסיף ומי קנה
      const memberStats = new Map<string, { name: string; added: number; purchased: number }>();

      for (const p of products) {
        const addedByName = (p.addedBy && typeof p.addedBy === 'object' && 'name' in p.addedBy)
          ? (p.addedBy as { name: string }).name : 'Unknown';
        const addedById = (p.addedBy && typeof p.addedBy === 'object' && '_id' in p.addedBy)
          ? (p.addedBy as { _id: any })._id.toString() : '';

        if (!memberStats.has(addedById)) {
          memberStats.set(addedById, { name: addedByName, added: 0, purchased: 0 });
        }
        const stat = memberStats.get(addedById)!;
        stat.added++;
        if (p.isPurchased) stat.purchased++;
      }

      const breakdown = Array.from(memberStats.values()).sort((a, b) => (b.added + b.purchased) - (a.added + a.purchased));
      const topContributor = breakdown.length > 0 ? { name: breakdown[0].name, count: breakdown[0].added } : null;
      const topBuyer = breakdown.reduce((best, cur) => cur.purchased > (best?.count || 0) ? { name: cur.name, count: cur.purchased } : best, null as { name: string; count: number } | null);

      results.push({
        name: list.name,
        icon: list.icon,
        membersCount: list.members.length + 1,
        topContributor,
        topBuyer,
        memberBreakdown: breakdown,
      });
    }

    return results;
  }
}
