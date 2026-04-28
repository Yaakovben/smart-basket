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
  // מחזורי קטגוריה - כל כמה ימים המשתמש קונה מקטגוריה מסוימת.
  // מחושב מהממוצע בין רכישות חוזרות באותה קטגוריה.
  categoryCycles: { category: string; avgDays: number; lastPurchased: string; samples: number }[];
  // קטגוריות שצפויות עכשיו - מבוסס על המחזור + הרכישה האחרונה.
  // daysOverdue<=0 = עוד לא הגיע הזמן, daysOverdue>0 = עבר הזמן הצפוי.
  upcomingNeeds: { category: string; daysOverdue: number; nextDateISO: string }[];
  // אנומליות - שינויים פתאומיים בהרגלי הקנייה.
  anomalies: { type: 'returning' | 'fading' | 'surge'; category: string; description: string }[];
}

// מצב ריק - משמש כתוצאה ברירת מחדל למשתמשים בלי נתונים
function emptyInsights(): InsightsData {
  return {
    topProducts: [], categoryBreakdown: [],
    stats: { totalProducts: 0, totalPurchased: 0, totalLists: 0, avgProductsPerList: 0, mostActiveDay: '', completionRate: 0 },
    forgotten: [],
    shoppingFrequency: { avgDaysBetween: 0, lastShoppingDate: null, predictedNextDate: null },
    smartTips: [], hourlyActivity: new Array(24).fill(0), weekdayActivity: new Array(7).fill(0),
    shoppingScore: 0,
    shoppingPersonality: { type: 'מתחיל', emoji: '🌱', description: 'התחל להשתמש באפליקציה כדי לגלות את הפרופיל שלך' },
    streaks: { currentWeeks: 0, longestWeeks: 0 },
    monthComparison: { productsGrowth: 0, completionGrowth: 0, previousTotal: 0 },
    weeklyTrends: [], groupStats: [],
    categoryCycles: [], upcomingNeeds: [], anomalies: [],
  };
}

// חישוב מחזורי קנייה לכל קטגוריה.
// משתמש בקטגוריות שיש להן לפחות 3 רכישות נפרדות בימים שונים, אחרת המחזור לא משמעותי.
function computeCategoryCycles(purchasedProducts: { category: string; updatedAt: Date }[]): {
  cycles: InsightsData['categoryCycles'];
  upcoming: InsightsData['upcomingNeeds'];
} {
  // אוספים תאריכי קנייה ייחודיים לכל קטגוריה
  const catDates = new Map<string, Set<string>>();
  for (const p of purchasedProducts) {
    const key = new Date(p.updatedAt).toDateString();
    if (!catDates.has(p.category)) catDates.set(p.category, new Set());
    catDates.get(p.category)!.add(key);
  }

  const cycles: InsightsData['categoryCycles'] = [];
  const upcoming: InsightsData['upcomingNeeds'] = [];
  const now = Date.now();

  for (const [category, datesSet] of catDates.entries()) {
    if (datesSet.size < 3) continue; // צריך לפחות 3 רכישות לחישוב משמעותי
    const dates = Array.from(datesSet).map(s => new Date(s).getTime()).sort((a, b) => a - b);
    const diffs: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const d = (dates[i] - dates[i - 1]) / 86400000;
      if (d > 0 && d < 60) diffs.push(d); // מסנן outliers (יותר מחודשיים = לא מחזור)
    }
    if (diffs.length === 0) continue;
    const avgDays = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    const lastTs = dates[dates.length - 1];
    const lastPurchased = new Date(lastTs).toISOString();
    cycles.push({ category, avgDays, lastPurchased, samples: diffs.length + 1 });

    // חישוב daysOverdue: כמה ימים עברו מאז שהיה אמור לקנות שוב
    const expectedNextTs = lastTs + avgDays * 86400000;
    const daysOverdue = Math.round((now - expectedNextTs) / 86400000);
    if (daysOverdue >= -3) { // 3 ימים לפני הזמן הצפוי או אחרי
      upcoming.push({
        category,
        daysOverdue,
        nextDateISO: new Date(expectedNextTs).toISOString(),
      });
    }
  }

  // מיון: קודם מה שפג, לפי גודל החריגה
  cycles.sort((a, b) => a.avgDays - b.avgDays);
  upcoming.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return { cycles, upcoming: upcoming.slice(0, 5) };
}

// זיהוי אנומליות - קטגוריות שחזרו אחרי הפסקה, או שנעלמו, או עלייה פתאומית.
function detectAnomalies(allProducts: { category: string; createdAt: Date; isPurchased: boolean }[]): InsightsData['anomalies'] {
  const anomalies: InsightsData['anomalies'] = [];
  const now = Date.now();
  const RECENT_MS = 14 * 86400000; // 14 ימים אחרונים
  const PRIOR_MS = 30 * 86400000;  // 30 ימים שלפני
  const recentCutoff = now - RECENT_MS;
  const priorCutoff = now - RECENT_MS - PRIOR_MS;

  // איסוף לפי קטגוריה: ספירות בחלון אחרון ובחלון קודם
  const catWindow = new Map<string, { recent: number; prior: number; older: number }>();
  for (const p of allProducts) {
    const ts = new Date(p.createdAt).getTime();
    const cur = catWindow.get(p.category) || { recent: 0, prior: 0, older: 0 };
    if (ts >= recentCutoff) cur.recent++;
    else if (ts >= priorCutoff) cur.prior++;
    else cur.older++;
    catWindow.set(p.category, cur);
  }

  for (const [category, w] of catWindow.entries()) {
    // חוזרת אחרי הפסקה: 0 בחודש שעבר, 0 בכל הזמן הרחוק, אבל פתאום יש בחודש האחרון
    if (w.older >= 3 && w.prior === 0 && w.recent >= 2) {
      anomalies.push({ type: 'returning', category, description: `חזרת לקנות ${category} אחרי הפסקה` });
    }
    // נעלמה: היה בעבר, לא בחודש האחרון ולא לפני
    else if (w.older >= 5 && w.prior === 0 && w.recent === 0) {
      anomalies.push({ type: 'fading', category, description: `הפסקת לקנות ${category} בחודש האחרון` });
    }
    // עלייה פתאומית: 2x מהממוצע
    else if (w.prior >= 2 && w.recent >= w.prior * 2 && w.recent >= 4) {
      anomalies.push({ type: 'surge', category, description: `עלייה משמעותית ברכישות של ${category}` });
    }
  }

  return anomalies.slice(0, 3);
}

// זיהוי אישיות קנייה לפי הפרופיל של המשתמש
function detectPersonality(
  completionRate: number, avgDays: number, catCount: number, forgottenCount: number, hourly: number[]
): InsightsData['shoppingPersonality'] {
  const peakHour = hourly.indexOf(Math.max(...hourly));
  const isEarlyBird = peakHour < 12;
  const isConsistent = avgDays > 0 && avgDays <= 7;
  const isDiverse = catCount >= 5;

  if (completionRate >= 85 && isConsistent) {
    return { type: 'המתכנן', emoji: '🎯', description: 'קונה בקביעות, משלים רשימות, מאורגן' };
  }
  if (isDiverse && completionRate >= 60) {
    return { type: 'השף', emoji: '👨‍🍳', description: 'קונה ממגוון קטגוריות, אוהב גיוון' };
  }
  if (isConsistent && isEarlyBird) {
    return { type: 'המשכים', emoji: '🌅', description: 'קונה בבוקר, שגרה קבועה ויציבה' };
  }
  if (forgottenCount >= 3) {
    return { type: 'הספונטני', emoji: '🎲', description: 'רשימות מגוונות, אוהב להתנסות בדברים חדשים' };
  }
  if (completionRate >= 70) {
    return { type: 'היעיל', emoji: '⚡', description: 'משלים את מה שמתכנן, חסכוני בזמן' };
  }
  if (avgDays > 14) {
    return { type: 'המאגר', emoji: '🏔️', description: 'קונה בכמויות, פחות תכוף אבל מסודר' };
  }
  return { type: 'הגולש', emoji: '🏄', description: 'קונה לפי מצב רוח, גמיש ופתוח' };
}

// סטטיסטיקות ברמת קבוצה: מי הכי תורם, מי הכי קונה, פירוט חברים
async function getGroupStats(lists: { _id: any; name: string; icon: string; isGroup: boolean; owner: any; members: { user: any }[] }[], _userId: string): Promise<InsightsData['groupStats']> {
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

// הפונקציה הראשית - מחזירה את כל התובנות של המשתמש
export async function getUserInsights(userId: string): Promise<InsightsData> {
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
    const productsGrowth = prevMonthProducts.length > 0 ? Math.round(((thisMonthProducts.length - prevMonthProducts.length) / prevMonthProducts.length) * 100) : 0;

    // ===== מגמות שבועיות (8 שבועות) =====
    const weeklyTrends: InsightsData['weeklyTrends'] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(now.getTime() - (i * 7 + now.getDay()) * 86400000);
      const we = new Date(ws.getTime() + 7 * 86400000);
      weeklyTrends.push({
        week: `${ws.getDate()}/${ws.getMonth() + 1}`,
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
      monthComparison: { productsGrowth, completionGrowth: completionRate - prevCompletionRate, previousTotal: prevMonthProducts.length },
      weeklyTrends,
      groupStats: await getGroupStats(lists, userId),
      ...((() => {
        const { cycles, upcoming } = computeCategoryCycles(purchasedProducts);
        return { categoryCycles: cycles, upcomingNeeds: upcoming };
      })()),
      anomalies: detectAnomalies(allProducts),
    };
  } catch {
    return emptyInsights();
  }
}
