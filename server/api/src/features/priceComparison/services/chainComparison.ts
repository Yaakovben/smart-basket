import type { ChainId } from '../models/Price.model';
import { PriceDAL } from '../dal/price.dal';
import { getRegisteredChains } from './priceSync.service';
import { findNearestBranch, type UserLocation } from './branches.service';
import { matchNormalizedName, getSearchTokensForName, BETA_CHAIN_ID, type NameMatch } from './productMatcher';
import type { PriceChainTotal, PriceMatch } from './priceComparison.types';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PendingProductLean {
  _id: unknown;
  name: string;
  quantity: number;
}

// משווה את הסל של המשתמש בין כל הרשתות הרשומות (מה-adapters, לא רק אלה עם
// נתונים) - כך רשת שלא פרסמה קובץ היום עדיין מופיעה עם אינדיקציה ברורה
// "אין נתונים היום" במקום להיעלם מה-UI.
export async function buildChainTotals(
  pendingProducts: PendingProductLean[],
  uniqueNames: string[],
  nameMatchCache: Map<string, NameMatch>,
  userLocation?: UserLocation
): Promise<PriceChainTotal[]> {
  const registered = getRegisteredChains();
  const activeCountsMap = new Map(
    (await PriceDAL.getActiveChainsWithCounts()).map(c => [c.chainId, c.count])
  );
  const activeChains = registered.map(r => ({
    chainId: r.chainId as ChainId,
    chainName: r.chainName,
    hasData: (activeCountsMap.get(r.chainId as ChainId) ?? 0) > 0,
  }));

  // אופטימיזציה: פעם אחת לכל שם ייחודי - שאילתה אחת שמחזירה candidates מכל הרשתות יחד.
  // חוסך N×M שאילתות. limit גבוה כי candidates מ-10 רשתות צריכים מקום.
  const candidatesByName = new Map<string, Awaited<ReturnType<typeof PriceDAL.findByAnyToken>>>();
  await Promise.all(
    uniqueNames.map(async name => {
      const tokens = getSearchTokensForName(name);
      if (tokens.length === 0) {
        candidatesByName.set(name, []);
        return;
      }
      try {
        const items = await PriceDAL.findByAnyToken(tokens, undefined, 60 * Math.max(1, activeChains.length));
        candidatesByName.set(name, items);
      } catch {
        candidatesByName.set(name, []);
      }
    })
  );

  const chainTotals: PriceChainTotal[] = await Promise.all(
    activeChains.map(async ({ chainId, chainName, hasData }) => {
      // הסניף הקרוב לרשת זו (אם המשתמש שיתף מיקום ויש לרשת סניפים ב-seed).
      // מוצמד גם לרשתות ללא נתונים היום - המשתמש עדיין יכול לראות "הסניף הקרוב ביקרתי".
      const nearestBranch = userLocation ? (await findNearestBranch(chainId, userLocation)) ?? undefined : undefined;

      // אם אין לרשת נתונים היום - מחזירים מיד כרטיס ריק (חוסך חישובים)
      if (!hasData) {
        return {
          chainId, chainName,
          total: 0, matchedCount: 0,
          unmatchedCount: pendingProducts.length,
          isCheapest: false, isComplete: false, savings: 0,
          hasData: false,
          nearestBranch,
          matches: pendingProducts.map(p => ({
            productId: String(p._id),
            userProductName: p.name,
            userQuantity: p.quantity || 1,
            normalizedName: '',
            matched: false,
            chainId, chainName,
            itemName: '', price: 0, barcode: '',
            matchConfidence: 0,
            matchedTokens: [], userTokens: [],
          } as PriceMatch)),
        };
      }
      // לרשת "הראשית" (BETA) - יש לנו כבר matchCache, לא לבצע פעם שנייה
      const isPrimaryChain = chainId === BETA_CHAIN_ID;

      const chainMatchCache = isPrimaryChain
        ? nameMatchCache
        : await (async () => {
            const cache = new Map<string, NameMatch>();
            await Promise.all(
              uniqueNames.map(async name => {
                try {
                  // משתמשים ב-candidates שכבר הובאו - אין פנייה ל-DB
                  cache.set(name, await matchNormalizedName(name, chainId, chainName, candidatesByName.get(name) || []));
                } catch {
                  cache.set(name, {
                    normalizedName: '',
                    matched: false,
                    chainId,
                    chainName,
                    itemName: '',
                    price: 0,
                    barcode: '',
                    matchConfidence: 0,
                    matchedTokens: [],
                    userTokens: [],
                  });
                }
              })
            );
            return cache;
          })();

      let chainTotal = 0;
      let matched = 0;
      let unmatched = 0;
      // בונים את הרשימה המפורטת של כל המוצרים של המשתמש עם המחיר ברשת הזו
      const chainMatches: PriceMatch[] = pendingProducts.map(p => {
        const nameMatch = chainMatchCache.get(p.name)!;
        if (nameMatch.matched) {
          chainTotal += nameMatch.price * (p.quantity || 1);
          matched += 1;
        } else {
          unmatched += 1;
        }
        return {
          ...nameMatch,
          productId: String(p._id),
          userProductName: p.name,
          userQuantity: p.quantity || 1,
        };
      });
      // מיון בתוך הרשת: קודם זוהו (לפי סכום יורד), אחר כך לא זוהו
      chainMatches.sort((a, b) => {
        if (a.matched !== b.matched) return a.matched ? -1 : 1;
        if (a.matched) return (b.price * b.userQuantity) - (a.price * a.userQuantity);
        return 0;
      });

      return {
        chainId,
        chainName,
        total: round2(chainTotal),
        matchedCount: matched,
        unmatchedCount: unmatched,
        isCheapest: false,
        isComplete: false,
        savings: 0,
        hasData: true,
        nearestBranch,
        matches: chainMatches,
      };
    })
  );

  markCheapestAndComplete(chainTotals);

  // מיון: יש נתונים → "הכי זול" → סל שלם → לפי סכום
  chainTotals.sort((a, b) => {
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
    if (a.isCheapest !== b.isCheapest) return a.isCheapest ? -1 : 1;
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    if (a.matchedCount === 0 && b.matchedCount > 0) return 1;
    if (b.matchedCount === 0 && a.matchedCount > 0) return -1;
    if (a.isComplete && b.isComplete) return a.total - b.total;
    return b.matchedCount - a.matchedCount;
  });

  return chainTotals;
}

// מסמן isComplete ("סל שלם" - זיהתה הכי הרבה מוצרים) ו-isCheapest + savings
// (השוואה תפוחים-לתפוחים על הסט המשותף של מוצרים שזוהו בכל הרשתות עם נתונים).
// משנה את chainTotals in-place.
function markCheapestAndComplete(chainTotals: PriceChainTotal[]): void {
  const maxMatched = chainTotals.reduce((m, c) => Math.max(m, c.matchedCount), 0);
  if (maxMatched > 0) {
    for (const ct of chainTotals) {
      ct.isComplete = ct.matchedCount === maxMatched;
    }
  }

  // קביעת "הכי זול" על בסיס תפוחים-לתפוחים: רק המוצרים שכל הרשתות עם נתונים זיהו.
  // אחרת רשת שזיהתה דווקא את המוצרים היקרים תיראה יקרה גם אם בפועל היא זולה,
  // ורשת שזיהתה רק את הזולים תיראה זולה בלי להיות באמת.
  const dataChains = chainTotals.filter(c => c.hasData && c.matchedCount > 0);
  if (dataChains.length === 0) return;

  const idSets = dataChains.map(c =>
    new Set(c.matches.filter(m => m.matched).map(m => m.productId))
  );
  // חיתוך — מוצרים שמופיעים בכל הרשתות עם הנתונים
  const commonIds = idSets.reduce<Set<string> | null>((acc, s) => {
    if (acc === null) return new Set(s);
    const next = new Set<string>();
    for (const id of acc) if (s.has(id)) next.add(id);
    return next;
  }, null) ?? new Set<string>();

  if (commonIds.size > 0) {
    // השוואה על תת-הסל המשותף
    const comparableByChain = new Map<string, number>();
    for (const ct of dataChains) {
      const sum = ct.matches
        .filter(m => m.matched && commonIds.has(m.productId))
        .reduce((s, m) => s + m.price * m.userQuantity, 0);
      comparableByChain.set(ct.chainId, sum);
    }
    const entries = [...comparableByChain.entries()].sort((a, b) => a[1] - b[1]);
    const cheapestId = entries[0][0];
    const maxComp = entries[entries.length - 1][1];
    for (const ct of chainTotals) {
      if (ct.chainId === cheapestId) ct.isCheapest = true;
      const comp = comparableByChain.get(ct.chainId);
      // החיסכון משקף את הפער על תת-הסל המשותף — מספר הוגן ויציב
      if (comp !== undefined) ct.savings = round2(maxComp - comp);
    }
  } else {
    // אין מוצר משותף בכלל — נופלים ללוגיקה הישנה: הזול ביותר מבין השלמות
    const completeChains = chainTotals.filter(c => c.isComplete);
    if (completeChains.length > 0) {
      const sorted = [...completeChains].sort((a, b) => a.total - b.total);
      const cheapestId = sorted[0].chainId;
      const maxTotal = sorted[sorted.length - 1].total;
      for (const ct of chainTotals) {
        if (ct.chainId === cheapestId) ct.isCheapest = true;
        if (ct.isComplete) ct.savings = round2(maxTotal - ct.total);
      }
    }
  }
}
