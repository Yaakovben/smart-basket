import { Product } from '../models';
import { ListDAL } from '../dal';

export interface InsightsData {
  // מוצרים שנקנים הכי הרבה
  topProducts: { name: string; count: number; category: string }[];
  // פילוח לפי קטגוריה
  categoryBreakdown: { category: string; count: number; percentage: number }[];
  // סטטיסטיקות כלליות
  stats: {
    totalProducts: number;
    totalPurchased: number;
    totalLists: number;
    avgProductsPerList: number;
    mostActiveDay: string;
  };
  // מוצרים שאולי שכחת (היו ברשימות ישנות אבל לא באחרונה)
  forgotten: { name: string; lastSeen: string; category: string }[];
  // תדירות קנייה
  shoppingFrequency: {
    avgDaysBetween: number;
    lastShoppingDate: string | null;
  };
}

export class InsightsService {
  static async getUserInsights(userId: string): Promise<InsightsData> {
    // מציאת כל הרשימות של המשתמש
    const lists = await ListDAL.findUserLists(userId);
    const listIds = lists.map(l => l._id);

    if (listIds.length === 0) {
      return this.emptyInsights();
    }

    // כל המוצרים של המשתמש מכל הרשימות
    const allProducts = await Product.find({ listId: { $in: listIds } })
      .sort({ createdAt: -1 })
      .lean();

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
    const purchaseDates = purchasedProducts
      .map(p => new Date(p.updatedAt).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i)
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
    const activeListIds = new Set(lists.filter(l => {
      const products = allProducts.filter(p => p.listId.toString() === l._id.toString());
      return products.some(p => !p.isPurchased);
    }).map(l => l._id.toString()));

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

    return {
      topProducts,
      categoryBreakdown,
      stats: {
        totalProducts: allProducts.length,
        totalPurchased: purchasedProducts.length,
        totalLists: lists.length,
        avgProductsPerList: Math.round(allProducts.length / lists.length),
        mostActiveDay: dayNames[maxDayIdx],
      },
      forgotten,
      shoppingFrequency: {
        avgDaysBetween,
        lastShoppingDate: purchaseDates[0] ? new Date(purchaseDates[0]).toISOString() : null,
      },
    };
  }

  private static emptyInsights(): InsightsData {
    return {
      topProducts: [],
      categoryBreakdown: [],
      stats: { totalProducts: 0, totalPurchased: 0, totalLists: 0, avgProductsPerList: 0, mostActiveDay: '' },
      forgotten: [],
      shoppingFrequency: { avgDaysBetween: 0, lastShoppingDate: null },
    };
  }
}
