import { Product } from '../models';
import { ListDAL } from '../dal';
import type { InsightsData } from './insights.types';
import { emptyInsights, computeCategoryCycles, detectAnomalies, detectPersonality } from './insightsAnalytics';
import { getGroupStats } from './insightsGroupStats';
import { computeSpending, emptySpending } from './spending.service';

export type { InsightsData } from './insights.types';

export interface GetUserInsightsOptions {
  // computeSpending מריץ regex-search לא-מעוגן (unanchored, לא יכול להשתמש
  // באינדקס) על כל שם מוצר ייחודי שהמשתמש קנה, מול קולקציית prices (מאות
  // אלפי מסמכים) - החלק היקר ביותר בחישוב. עבור עוזר ה-AI זה רק שורה אחת
  // "nice to have" בהקשר, לא קריטי - מדלגים עליו כדי לזרז משמעותית את
  // התשובה. דף התובנות ממשיך לקבל את החישוב המלא (ברירת המחדל).
  includeSpending?: boolean;
}

// הפונקציה הראשית - מחזירה את כל התובנות של המשתמש
export async function getUserInsights(userId: string, options: GetUserInsightsOptions = {}): Promise<InsightsData> {
  const { includeSpending = true } = options;
  try {
    const lists = await ListDAL.findUserLists(userId);
    const listIds = lists.map(l => l._id);

    if (listIds.length === 0) {
      return emptyInsights();
    }

    // שליפה ישירה עם lean לביצועים (analytics בלבד, לא צריך populate)
    const allProducts = await Product.find({ listId: { $in: listIds } }).lean();

    if (allProducts.length === 0) {
      return emptyInsights();
    }

    const purchasedProducts = allProducts.filter(p => p.isPurchased);

    // ===== מוצרים נפוצים =====
    const productCounts = new Map<string, { count: number; category: string }>();
    for (const p of allProducts) {
      const key = p.name.toLowerCase().trim();
      const existing = productCounts.get(key);
      if (existing) existing.count++;
      else productCounts.set(key, { count: 1, category: p.category });
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
        category, count,
        percentage: Math.round((count / totalForPercentage) * 100)
      }));

    // ===== יום הכי פעיל =====
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayCounts = new Array(7).fill(0);
    for (const p of allProducts) dayCounts[new Date(p.createdAt).getDay()]++;
    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));

    // ===== תדירות קנייה =====
    const dateSet = new Set<string>();
    for (const p of purchasedProducts) dateSet.add(new Date(p.updatedAt).toDateString());
    const purchaseDates = Array.from(dateSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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
    const listsWithPending = new Set<string>();
    for (const p of allProducts) {
      if (!p.isPurchased) listsWithPending.add(p.listId.toString());
    }
    const recentProductNames = new Set(
      allProducts.filter(p => listsWithPending.has(p.listId.toString())).map(p => p.name.toLowerCase().trim())
    );

    const oldProducts = new Map<string, { lastSeen: Date; category: string; count: number }>();
    for (const p of allProducts) {
      const key = p.name.toLowerCase().trim();
      if (recentProductNames.has(key)) continue;
      const existing = oldProducts.get(key);
      if (!existing) oldProducts.set(key, { lastSeen: p.createdAt, category: p.category, count: 1 });
      else {
        existing.count++;
        if (p.createdAt > existing.lastSeen) existing.lastSeen = p.createdAt;
      }
    }

    const forgotten = Array.from(oldProducts.entries())
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, lastSeen: data.lastSeen.toISOString(), category: data.category }));

    // ===== פעילות לפי שעה =====
    const hourlyActivity = new Array(24).fill(0);
    for (const p of allProducts) hourlyActivity[new Date(p.createdAt).getHours()]++;

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
    if (topProducts.length > 0) smartTips.push(`המוצר הנפוץ שלך הוא "${topProducts[0].name}" (${topProducts[0].count} פעמים)`);
    if (categoryBreakdown.length > 0) smartTips.push(`הקטגוריה הדומיננטית: ${categoryBreakdown[0].category} (${categoryBreakdown[0].percentage}%)`);
    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    if (hourlyActivity[peakHour] > 0) smartTips.push(`השעה הכי פעילה שלך: ${peakHour}:00`);
    if (avgDaysBetween > 0) smartTips.push(`קצב קנייה ממוצע: כל ${avgDaysBetween} ימים`);
    if (completionRate < 50) smartTips.push('טיפ: נסה לסיים יותר מוצרים מהרשימה לפני שמתחיל חדשה');
    if (forgotten.length > 0) smartTips.push(`${forgotten.length} מוצרים שהפסקת לקנות, אולי שכחת?`);

    const weekdayActivity = [...dayCounts];

    // ===== חיזוי תאריך קנייה הבא =====
    let predictedNextDate: string | null = null;
    if (purchaseDates[0] && avgDaysBetween > 0) {
      const last = new Date(purchaseDates[0]);
      const next = new Date(last.getTime() + avgDaysBetween * 86400000);
      if (next.getTime() < Date.now()) next.setTime(Date.now() + 86400000);
      predictedNextDate = next.toISOString();
    }

    const personality = detectPersonality(completionRate, avgDaysBetween, categoryBreakdown.length, forgotten.length, hourlyActivity);

    // ===== סטריקים שבועיים =====
    const weekSet = new Set<string>();
    for (const p of purchasedProducts) {
      const d = new Date(p.updatedAt);
      const wk = Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
      weekSet.add(`${d.getFullYear()}-${wk}`);
    }
    const sortedWeeks = Array.from(weekSet).sort().reverse();
    let currentWeeks = 0; let longestWeeks = 0; let streak = 0;
    for (let i = 0; i < sortedWeeks.length; i++) {
      if (i === 0) { streak = 1; continue; }
      const [py, pw] = sortedWeeks[i - 1].split('-').map(Number);
      const [cy, cw] = sortedWeeks[i].split('-').map(Number);
      if ((py === cy && pw - cw === 1) || (py - cy === 1 && cw >= 52 && pw <= 1)) streak++;
      else {
        if (currentWeeks === 0) currentWeeks = streak;
        longestWeeks = Math.max(longestWeeks, streak);
        streak = 1;
      }
    }
    longestWeeks = Math.max(longestWeeks, streak);
    if (currentWeeks === 0) currentWeeks = streak;

    // ===== השוואה לחודש קודם =====
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthProducts = allProducts.filter(p => new Date(p.createdAt) >= thisMonthStart);
    const prevMonthProducts = allProducts.filter(p => new Date(p.createdAt) >= prevMonthStart && new Date(p.createdAt) < thisMonthStart);
    const prevPurchased = prevMonthProducts.filter(p => p.isPurchased);
    const prevCompletionRate = prevMonthProducts.length > 0 ? Math.round((prevPurchased.length / prevMonthProducts.length) * 100) : 0;
    const hasBaseline = prevMonthProducts.length > 0;
    const productsGrowth = hasBaseline ? Math.round(((thisMonthProducts.length - prevMonthProducts.length) / prevMonthProducts.length) * 100) : 0;

    // ===== מגמות שבועיות (8 שבועות) =====
    const weeklyTrends: InsightsData['weeklyTrends'] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(now.getTime() - (i * 7 + now.getDay()) * 86400000);
      const we = new Date(ws.getTime() + 7 * 86400000);
      // תווית: D/M לשנה הנוכחית, D/M/YY כשהשבוע משנה אחרת (מונע בלבול
      // בין "15/3" של שנה זו לבין שנה קודמת בתצוגות multi-month).
      const yearSuffix = ws.getFullYear() !== now.getFullYear() ? `/${String(ws.getFullYear()).slice(-2)}` : '';
      weeklyTrends.push({
        week: `${ws.getDate()}/${ws.getMonth() + 1}${yearSuffix}`,
        added: allProducts.filter(p => new Date(p.createdAt) >= ws && new Date(p.createdAt) < we).length,
        purchased: purchasedProducts.filter(p => new Date(p.updatedAt) >= ws && new Date(p.updatedAt) < we).length,
      });
    }

    // תובנות מהנתונים החדשים
    if (predictedNextDate) {
      const daysUntil = Math.ceil((new Date(predictedNextDate).getTime() - Date.now()) / 86400000);
      if (daysUntil <= 2) smartTips.push(`🔔 הקנייה הבאה צפויה ${daysUntil === 0 ? 'היום' : daysUntil === 1 ? 'מחר' : 'מחרתיים'}`);
    }
    if (currentWeeks >= 3) smartTips.push(`🔥 סטריק! ${currentWeeks} שבועות רצופים`);
    if (productsGrowth > 20) smartTips.push(`📈 עלייה של ${productsGrowth}% לעומת חודש שעבר`);
    else if (productsGrowth < -20) smartTips.push(`📉 ירידה של ${Math.abs(productsGrowth)}% לעומת חודש שעבר`);

    // groupStats ו-spending לא תלויים זה בזה (הראשון צריך lists, השני צריך
    // purchasedProducts - שניהם כבר בזיכרון) - מריצים במקביל במקום ברצף.
    // אין כאן cache פר-משתמש בכוונה: spending מצטבר על כל הרשימות שהמשתמש
    // חבר בהן (כולל רשימות קבוצתיות), אז רכישה של חבר קבוצה אחר צריכה
    // להשתקף מיד - cache לפי userId-של-הפועל בלבד היה משאיר את שאר החברים
    // עם נתונים ישנים עד שה-TTL פג. getActiveChainsWithCounts כבר עטוף
    // ב-cache גלובלי משלו (price.dal.ts) וזה סיפק את רוב שיפור הביצועים
    // בלי הסיכון הזה, כי הוא לא תלוי בפעולה של משתמש ספציפי.
    const [groupStats, spending] = await Promise.all([
      getGroupStats(lists, userId, allProducts),
      includeSpending ? computeSpending(userId, purchasedProducts) : Promise.resolve(emptySpending(false)),
    ]);

    return {
      topProducts, categoryBreakdown,
      stats: {
        totalProducts: allProducts.length, totalPurchased: purchasedProducts.length,
        totalLists: lists.length, avgProductsPerList: Math.round(allProducts.length / lists.length),
        mostActiveDay: dayNames[maxDayIdx], completionRate,
      },
      forgotten,
      shoppingFrequency: { avgDaysBetween, lastShoppingDate: purchaseDates[0] ? new Date(purchaseDates[0]).toISOString() : null, predictedNextDate },
      smartTips, hourlyActivity, weekdayActivity, shoppingScore: score,
      shoppingPersonality: personality,
      streaks: { currentWeeks, longestWeeks },
      monthComparison: { productsGrowth, completionGrowth: completionRate - prevCompletionRate, previousTotal: prevMonthProducts.length, hasBaseline },
      weeklyTrends,
      groupStats,
      ...((() => {
        const { cycles, upcoming } = computeCategoryCycles(purchasedProducts);
        return { categoryCycles: cycles, upcomingNeeds: upcoming };
      })()),
      anomalies: detectAnomalies(allProducts),
      spending,
    };
  } catch (err) {
    // לוג מפורט - עוזר לאתר שגיאות DB / queries כשהן קורות. במקום
    // להחזיר תובנות ריקות בשקט (שמסתיר באג), זורקים שהקונטרולר יחזיר 503.
    const msg = err instanceof Error ? err.message : 'unknown';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[insights] failed for user=${userId}: ${msg}`, stack);
    throw new Error(`insights_failed: ${msg}`);
  }
}
