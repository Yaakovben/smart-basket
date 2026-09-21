// חישובים טהורים להשוואת רשתות בכרטיס העליון - מיון, זיהוי הזולה וחיסכון.
// גם: מיפוי cheapestPriceByProduct לחוויית "הכי זול" בכל מוצר.

import type { PriceChainTotal } from '../types/priceComparison.types';

// חייב להיות זהה ל-MIN_VERIFIED_CHAIN_SHARE בשרת (chainComparison.ts)
const MIN_VERIFIED_CHAIN_SHARE = 0.6;

export type SortMode = 'distance' | 'price' | 'combined';

// הזולה ההוגנת: שלמות קודם לפי מחיר; אם אין שלמות, מבין הרשתות עם
// מספר ההתאמות המקסימלי - הזולה. ככה רשת עם 3 התאמות לא תופיע כ"זולה"
// מול רשת עם 8 התאמות בכמה שקלים יותר.
export const getCheapestChain = (chainTotals: PriceChainTotal[] | undefined): PriceChainTotal | undefined => {
  // השרת כבר קבע "הכי זול" על מוצרים זהים בלבד ועל מחירי סניף מאומתים -
  // זו ההכרעה האמינה. הלוגיקה שמתחת היא גיבוי כשהשרת לא סימן אף רשת.
  const serverCheapest = (chainTotals || []).find(c => c.isCheapest && c.matchedCount > 0);
  if (serverCheapest) return serverCheapest;
  const candidates = (chainTotals || []).filter(c => c.matchedCount > 0);
  if (candidates.length === 0) return undefined;
  const completes = candidates.filter(c => c.isComplete);
  if (completes.length > 0) {
    return completes.reduce((best, c) => c.total < best.total ? c : best, completes[0]);
  }
  const maxMatched = Math.max(...candidates.map(c => c.matchedCount));
  const top = candidates.filter(c => c.matchedCount === maxMatched);
  return top.reduce((best, c) => c.total < best.total ? c : best, top[0]);
};

export const getSavings = (chainTotals: PriceChainTotal[] | undefined, cheapest: PriceChainTotal | undefined): number => {
  // החיסכון שהשרת חישב על תת-הסל המשותף - הפער האמיתי בין הזולה ליקרה
  if (cheapest?.isCheapest && cheapest.savings > 0) return cheapest.savings;
  const completeChains = chainTotals?.filter(c => c.isComplete && c.matchedCount > 0) ?? [];
  const maxTotal = completeChains.length > 1 ? Math.max(...completeChains.map(c => c.total)) : 0;
  return cheapest && maxTotal > cheapest.total ? maxTotal - cheapest.total : 0;
};

export const hasAnyChainLocation = (chainTotals: PriceChainTotal[] | undefined): boolean =>
  (chainTotals || []).some(c => c.nearestBranch);

export interface ProductPriceRange {
  cheapest: number;
  mostExpensive: number;
  // הברקוד שעליו חושב הטווח. משווים רק בין התאמות לאותו מוצר בדיוק.
  barcode: string;
  // בכמה רשתות המוצר הזה נמצא (בברקוד הזה)
  chainCount: number;
}

// בונה Map: productId → טווח מחירים לאותו מוצר בדיוק (אותו ברקוד) - לחוויית
// "הכי זול" per-product. לא משווים בין מוצרים שונים שהותאמו לאותו שם, וכשיש
// מחירים מאומתים בסניפים משווים רק אותם (מחיר ארצי הוא הטיה כלפי מטה).
export const buildCheapestPriceMap = (chainTotals: PriceChainTotal[] | undefined): Map<string, ProductPriceRange> => {
  const chains = chainTotals || [];
  // זהה לשרת: רק כשלפחות 60% מהרשתות עם התאמות מאומתות בסניף. אחרת רשת אחת
  // מאומתת הייתה מוציאה את כל השאר מההשוואה.
  const matchedChains = chains.filter(c => c.hasData && c.matchedCount > 0);
  const verifiedChains = matchedChains.filter(c => c.matches.some(m => m.matched && m.priceVerifiedAtBranch));
  const useVerifiedOnly = matchedChains.length > 0 && verifiedChains.length / matchedChains.length >= MIN_VERIFIED_CHAIN_SHARE;

  const byProduct = new Map<string, Map<string, number[]>>(); // productId -> barcode -> prices
  for (const chain of chains) {
    for (const m of chain.matches) {
      if (!m.matched || !m.barcode) continue;
      if (useVerifiedOnly && !m.priceVerifiedAtBranch) continue;
      const barcodes = byProduct.get(m.productId) ?? new Map<string, number[]>();
      const prices = barcodes.get(m.barcode) ?? [];
      prices.push(m.price);
      barcodes.set(m.barcode, prices);
      byProduct.set(m.productId, barcodes);
    }
  }

  const result = new Map<string, ProductPriceRange>();
  for (const [productId, barcodes] of byProduct) {
    // הברקוד שהכי הרבה רשתות מכירות; בשוויון - זה עם המחיר הנמוך יותר
    let best: { barcode: string; prices: number[] } | null = null;
    for (const [barcode, prices] of barcodes) {
      if (!best || prices.length > best.prices.length ||
          (prices.length === best.prices.length && Math.min(...prices) < Math.min(...best.prices))) {
        best = { barcode, prices };
      }
    }
    if (best) {
      result.set(productId, {
        cheapest: Math.min(...best.prices),
        mostExpensive: Math.max(...best.prices),
        barcode: best.barcode,
        chainCount: best.prices.length,
      });
    }
  }
  return result;
};

// כמה עוד אפשר לחסוך אם קונים כל מוצר ברשת הזולה שלו במקום הכול בזולה הכללית.
// סופרים רק מוצרים שנמצאו ביותר מרשת אחת (אותו ברקוד), ורק הפער החיובי.
export const getSplitSavings = (
  cheapest: PriceChainTotal | undefined,
  priceMap: Map<string, ProductPriceRange>
): number => {
  if (!cheapest) return 0;
  let total = 0;
  for (const m of cheapest.matches) {
    if (!m.matched) continue;
    const range = priceMap.get(m.productId);
    if (!range || range.chainCount < 2 || range.barcode !== m.barcode) continue;
    const gap = m.price - range.cheapest;
    if (gap > 0.005) total += gap * m.userQuantity;
  }
  return Math.round(total * 100) / 100;
};

// כמה ימים עברו מאז עדכון. undefined כשאין תאריך.
export const daysSince = (iso: string | undefined): number | undefined => {
  if (!iso) return undefined;
  const ms = Date.now() - new Date(iso).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : undefined;
};

// מעל כמה ימים נתוני רשת נחשבים ישנים
export const STALE_CHAIN_DAYS = 3;

// מיון לפי סורט-מוד. "קרוב" - לפי מרחק; "זול" - לפי מחיר;
// "משולב" - ציון מנורמל 50/50. אם אין מיקום, "קרוב"/"משולב" נופלים ל-price.
export const getSortedChains = (
  chainTotals: PriceChainTotal[] | undefined,
  sortMode: SortMode,
  hasAnyLocation: boolean
): PriceChainTotal[] => {
  const chains = [...(chainTotals || [])];
  const isEmpty = (c: PriceChainTotal) => c.matchedCount === 0;
  if (sortMode === 'distance' && hasAnyLocation) {
    // "קרוב" - מרחק קודם כל. אפילו רשת בלי מוצרים תופיע למעלה אם
    // הסניף שלה הקרוב ביותר. רק רשתות בלי מיקום בכלל יורדות לסוף.
    return chains.sort((a, b) => {
      const aDist = a.nearestBranch?.distanceKm ?? Infinity;
      const bDist = b.nearestBranch?.distanceKm ?? Infinity;
      return aDist - bDist;
    });
  }
  if (sortMode === 'combined' && hasAnyLocation) {
    // רק רשתות עם distanceKm מוחלט (יש קואורדינטות) משתתפות במיון "משולב".
    // סניפים עם כתובת בלבד יישארו במיקום הברירה.
    const withData = chains.filter(c => c.matchedCount > 0 && c.nearestBranch && typeof c.nearestBranch.distanceKm === 'number');
    if (withData.length > 0) {
      const prices = withData.map(c => c.total);
      const dists = withData.map(c => c.nearestBranch!.distanceKm!);
      const minP = Math.min(...prices), maxP = Math.max(...prices);
      const minD = Math.min(...dists), maxD = Math.max(...dists);
      const rangeP = (maxP - minP) || 1;
      const rangeD = (maxD - minD) || 1;
      const score = (c: PriceChainTotal) => {
        if (c.matchedCount === 0 || !c.nearestBranch) return Infinity;
        if (typeof c.nearestBranch.distanceKm !== 'number') return Infinity;
        return ((c.total - minP) / rangeP) * 0.5 + ((c.nearestBranch.distanceKm - minD) / rangeD) * 0.5;
      };
      return chains.sort((a, b) => score(a) - score(b));
    }
  }
  // 'זול' - הוגן: שלמות לפי מחיר, אחר כך חלקיות לפי מספר זיהויים, אחר כך ריקות
  return chains.sort((a, b) => {
    if (isEmpty(a) !== isEmpty(b)) return isEmpty(a) ? 1 : -1;
    // הזולה לפי השרת (מוצרים זהים + מחירי סניף מאומתים) תמיד ראשונה
    if (a.isCheapest !== b.isCheapest) return a.isCheapest ? -1 : 1;
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    if (a.isComplete && b.isComplete) return a.total - b.total;
    if (a.matchedCount !== b.matchedCount) return b.matchedCount - a.matchedCount;
    return a.total - b.total;
  });
};
