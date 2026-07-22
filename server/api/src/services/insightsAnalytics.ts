import type { InsightsData } from './insights.types';
import { emptySpending } from './spending.service';

// מצב ריק - משמש כתוצאה ברירת מחדל למשתמשים בלי נתונים
export function emptyInsights(): InsightsData {
  return {
    topProducts: [], categoryBreakdown: [],
    stats: { totalProducts: 0, totalPurchased: 0, totalLists: 0, avgProductsPerList: 0, mostActiveDay: '', completionRate: 0 },
    forgotten: [],
    shoppingFrequency: { avgDaysBetween: 0, lastShoppingDate: null, predictedNextDate: null },
    smartTips: [], hourlyActivity: new Array(24).fill(0), weekdayActivity: new Array(7).fill(0),
    shoppingScore: 0,
    shoppingPersonality: { type: 'מתחיל', emoji: '🌱', description: 'התחל להשתמש באפליקציה כדי לגלות את הפרופיל שלך' },
    streaks: { currentWeeks: 0, longestWeeks: 0 },
    monthComparison: { productsGrowth: 0, completionGrowth: 0, previousTotal: 0, hasBaseline: false },
    weeklyTrends: [], groupStats: [],
    categoryCycles: [], upcomingNeeds: [], anomalies: [],
    spending: emptySpending(),
  };
}

// חישוב מחזורי קנייה לכל קטגוריה.
// משתמש בקטגוריות שיש להן לפחות 3 רכישות נפרדות בימים שונים, אחרת המחזור לא משמעותי.
export function computeCategoryCycles(purchasedProducts: { category: string; updatedAt: Date }[]): {
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
export function detectAnomalies(allProducts: { category: string; createdAt: Date; isPurchased: boolean }[]): InsightsData['anomalies'] {
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
export function detectPersonality(
  completionRate: number, avgDays: number, catCount: number, forgottenCount: number, hourly: number[]
): InsightsData['shoppingPersonality'] {
  // הגנה מפני מערך פעילות-שעות ריק (כל הערכים 0): peakHour=0 ב-indexOf
  // יוביל לפרשנות שגויה של "מתעורר מוקדם". מסמנים -1 כדי לדלג על הסיווג הזה.
  const hasHourly = hourly.some(v => v > 0);
  const peakHour = hasHourly ? hourly.indexOf(Math.max(...hourly)) : -1;
  const isEarlyBird = peakHour >= 0 && peakHour < 12;
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
