/**
 * spending.service.ts
 *
 * מחשב הוצאה חודשית משוערת מתוך פריטים שסומנו כ"נקנו". אין באפליקציה מחיר
 * ששולם בפועל (Product לא שומר מחיר) - במקום זאת מתאימים כל שם מוצר למאגר
 * המחירים הממשלתי האמיתי (Price, אותו מנגנון matching שמשמש את טאב ההשוואה),
 * ובמודע מסמנים זאת בדיסקליימר במקום להעמיד פנים שזה מחיר מדויק ששולם.
 */

import { PriceDAL } from '../features/priceComparison/dal/price.dal';
import { matchNormalizedName, getSearchTokensForName } from '../features/priceComparison/services/productMatcher';

export interface SpendingData {
  enabled: boolean;
  monthTotal: number | null;
  monthMatchedCount: number;
  monthUnmatchedCount: number;
  projectedMonthTotal: number | null;
  daysElapsed: number;
  daysInMonth: number;
  topCategory: { category: string; amount: number; percentage: number } | null;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  previousMonthTotal: number | null;
  monthGrowthPct: number | null;
  hasBaseline: boolean;
  disclaimer: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const DISCLAIMER = 'ההוצאה מבוססת על התאמת שמות המוצרים שסימנת כנקנו למאגר המחירים הממשלתי האמיתי (פורטל השקיפות). ההתאמה עשויה להחמיץ פריטים או להיות לא מדויקת - זו הערכה, לא המחיר שבאמת שילמת.';

// שמות ייחודיים מתאימים דרך findByAnyToken - regex לא-מעוגן על קולקציית
// prices (מאות אלפי מסמכים), לא יכול להשתמש באינדקס (ראו הערה על
// GetUserInsightsOptions.includeSpending בinsights.service.ts). זה החלק
// היקר ביותר בטעינת דף התובנות - כל פתיחה/רענון (כולל visibilitychange,
// ראו useInsightsData.ts) הריץ את זה מחדש מאפס. cache קצר בזיכרון פר-משתמש,
// באותו דפוס בדיוק כמו CONTEXT_CACHE_TTL_MS ב-aiAssistant.service.ts,
// הופך פתיחות חוזרות/מעברי-טאב לכמעט מיידיות. TTL ארוך יותר מזה של ה-AI
// (5 דק' לעומת 3) כי הוצאה חודשית משוערת רגישה הרבה פחות לרעננות
// שנייה-שנייה מאשר תוכן שיחה - שווה ויתור קטן על טריות תמורת שיפור עצום
// בזמן טעינה.
const SPENDING_CACHE_TTL_MS = 5 * 60 * 1000;
const spendingCache = new Map<string, { data: SpendingData; expiresAt: number }>();

export function emptySpending(enabled = false): SpendingData {
  const now = new Date();
  return {
    enabled,
    monthTotal: null,
    monthMatchedCount: 0,
    monthUnmatchedCount: 0,
    projectedMonthTotal: null,
    daysElapsed: now.getDate(),
    daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    topCategory: null,
    categoryBreakdown: [],
    previousMonthTotal: null,
    monthGrowthPct: null,
    hasBaseline: false,
    disclaimer: DISCLAIMER,
  };
}

// מסכם רשימת רכישות (של חודש אחד) לפי ה-matches שכבר חושבו: סכום כולל +
// פילוח קטגוריות. פריטים שלא זוהו לא נכנסים לסכום (רק לספירת unmatched).
function summarizeMonth(
  purchases: { name: string; category: string; quantity: number }[],
  matchCache: Map<string, { matched: boolean; price: number }>
): { total: number; matchedCount: number; unmatchedCount: number; categoryAmounts: Map<string, number> } {
  let total = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  const categoryAmounts = new Map<string, number>();

  for (const p of purchases) {
    const m = matchCache.get(p.name);
    if (!m || !m.matched) { unmatchedCount++; continue; }
    matchedCount++;
    const amount = m.price * (p.quantity || 1);
    total += amount;
    categoryAmounts.set(p.category, (categoryAmounts.get(p.category) || 0) + amount);
  }

  return { total: round2(total), matchedCount, unmatchedCount, categoryAmounts };
}

export async function computeSpending(
  userId: string,
  purchasedProducts: { name: string; category: string; quantity: number; updatedAt: Date }[]
): Promise<SpendingData> {
  const cached = spendingCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const result = await computeSpendingUncached(purchasedProducts);
  spendingCache.set(userId, { data: result, expiresAt: Date.now() + SPENDING_CACHE_TTL_MS });
  return result;
}

async function computeSpendingUncached(
  purchasedProducts: { name: string; category: string; quantity: number; updatedAt: Date }[]
): Promise<SpendingData> {
  const activeChains = await PriceDAL.getActiveChainsWithCounts();
  if (activeChains.length === 0) return emptySpending(false);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const thisMonthPurchases = purchasedProducts.filter(p => new Date(p.updatedAt) >= thisMonthStart);
  const prevMonthPurchases = purchasedProducts.filter(p => new Date(p.updatedAt) >= prevMonthStart && new Date(p.updatedAt) < thisMonthStart);

  if (thisMonthPurchases.length === 0 && prevMonthPurchases.length === 0) {
    return emptySpending(true);
  }

  // התאמת שמות ייחודיים פעם אחת (דה-דופליקציה בין שני החודשים), במקביל.
  // בניגוד לטאב "מחירים" (שמתאים רק מול רשת ראשית אחת), כאן מחפשים בכל
  // הרשתות הפעילות ולוקחים את ההתאמה הזולה ביותר שנמצאה - כי אין לנו מושג
  // איפה המשתמש קנה בפועל, ורשת בודדת (osher_ad) מכסה רק חלק קטן מהמוצרים.
  // אותו דפוס בדיוק כמו chainComparison.ts: candidates רב-רשתיים פעם אחת,
  // ואז ניקוד per-chain בזיכרון בלי שאילתות DB נוספות.
  const uniqueNames = Array.from(new Set([...thisMonthPurchases, ...prevMonthPurchases].map(p => p.name)));

  const candidatesByName = new Map<string, Awaited<ReturnType<typeof PriceDAL.findByAnyToken>>>();
  await Promise.all(
    uniqueNames.map(async name => {
      const tokens = getSearchTokensForName(name);
      if (tokens.length === 0) { candidatesByName.set(name, []); return; }
      try {
        candidatesByName.set(name, await PriceDAL.findByAnyToken(tokens, undefined, 60 * activeChains.length));
      } catch {
        candidatesByName.set(name, []);
      }
    })
  );

  const matchCache = new Map<string, { matched: boolean; price: number }>();
  await Promise.all(
    uniqueNames.map(async name => {
      const candidates = candidatesByName.get(name) || [];
      let best: { matched: boolean; price: number } = { matched: false, price: 0 };
      for (const { chainId, chainName } of activeChains) {
        try {
          const m = await matchNormalizedName(name, chainId, chainName, candidates);
          if (m.matched && (!best.matched || m.price < best.price)) {
            best = { matched: true, price: m.price };
          }
        } catch { /* דילוג על הרשת הזו לשם הזה */ }
      }
      matchCache.set(name, best);
    })
  );

  const thisMonth = summarizeMonth(thisMonthPurchases, matchCache);
  const prevMonth = summarizeMonth(prevMonthPurchases, matchCache);

  const hasBaseline = prevMonthPurchases.length > 0 && prevMonth.matchedCount > 0;
  const previousMonthTotal = hasBaseline ? prevMonth.total : null;
  const monthGrowthPct = hasBaseline && prevMonth.total > 0
    ? Math.round(((thisMonth.total - prevMonth.total) / prevMonth.total) * 100)
    : null;

  const hasThisMonthData = thisMonth.matchedCount > 0;
  const monthTotal = hasThisMonthData ? thisMonth.total : null;
  const projectedMonthTotal = hasThisMonthData && daysElapsed > 0
    ? round2((thisMonth.total / daysElapsed) * daysInMonth)
    : null;

  const categoryTotal = Array.from(thisMonth.categoryAmounts.values()).reduce((a, b) => a + b, 0);
  const categoryBreakdown = Array.from(thisMonth.categoryAmounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount: round2(amount),
      percentage: categoryTotal > 0 ? Math.round((amount / categoryTotal) * 100) : 0,
    }));

  return {
    enabled: true,
    monthTotal,
    monthMatchedCount: thisMonth.matchedCount,
    monthUnmatchedCount: thisMonth.unmatchedCount,
    projectedMonthTotal,
    daysElapsed,
    daysInMonth,
    topCategory: categoryBreakdown[0] || null,
    categoryBreakdown,
    previousMonthTotal,
    monthGrowthPct,
    hasBaseline,
    disclaimer: DISCLAIMER,
  };
}
