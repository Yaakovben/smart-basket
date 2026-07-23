// חישובים טהורים להשוואת רשתות בכרטיס העליון - מיון, זיהוי הזולה וחיסכון.

import type { PriceChainTotal } from '../types/priceComparison.types';

export type SortMode = 'distance' | 'price' | 'combined';

// הזולה ההוגנת: שלמות קודם לפי מחיר; אם אין שלמות, מבין הרשתות עם
// מספר ההתאמות המקסימלי - הזולה. ככה רשת עם 3 התאמות לא תופיע כ"זולה"
// מול רשת עם 8 התאמות בכמה שקלים יותר.
export const getCheapestChain = (chainTotals: PriceChainTotal[] | undefined): PriceChainTotal | undefined => {
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
  const completeChains = chainTotals?.filter(c => c.isComplete && c.matchedCount > 0) ?? [];
  const maxTotal = completeChains.length > 1 ? Math.max(...completeChains.map(c => c.total)) : 0;
  return cheapest && maxTotal > cheapest.total ? maxTotal - cheapest.total : 0;
};

export const hasAnyChainLocation = (chainTotals: PriceChainTotal[] | undefined): boolean =>
  (chainTotals || []).some(c => c.nearestBranch);

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
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    if (a.isComplete && b.isComplete) return a.total - b.total;
    if (a.matchedCount !== b.matchedCount) return b.matchedCount - a.matchedCount;
    return a.total - b.total;
  });
};
