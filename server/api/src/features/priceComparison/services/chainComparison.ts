import type { ChainId } from '../models/Price.model';
import { PriceDAL } from '../dal/price.dal';
import { getRegisteredChains } from './priceSync.service';
import { applyOverridesToCache, type OverrideContext } from './matchOverrides';
import { BranchPriceDAL } from '../dal/branchPrice.dal';
import { findNearestBranch, getBranchByStore, type NearestBranch, type UserLocation } from './branches.service';
import { matchNormalizedName, finalizeMatch, getSearchTokensForName, BETA_CHAIN_ID, type NameMatch } from './productMatcher';
import type { PriceChainTotal, PriceMatch } from './priceComparison.types';

const round2 = (n: number) => Math.round(n * 100) / 100;

// רשת נכנסת לדירוג "הכי זול" רק אם כיסתה לפחות 60% ממה שהרשת המכסה ביותר כיסתה.
const MIN_RANKING_COVERAGE = 0.6;

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
  userLocation?: UserLocation,
  // סניף שהמשתמש בחר ידנית לכל רשת (chainId -> storeId). גובר על "הקרוב ביותר".
  chosenBranches?: Record<string, string>,
  // תיקוני התאמה של המשתמש - גוברים על ההתאמה האוטומטית ועל העיגון לברקוד
  overrideCtx?: OverrideContext
): Promise<PriceChainTotal[]> {
  const registered = getRegisteredChains();
  const activeList = await PriceDAL.getActiveChainsWithCounts();
  const activeCountsMap = new Map(activeList.map(c => [c.chainId, c.count]));
  const lastUpdatedMap = new Map(activeList.map(c => [c.chainId, c.lastUpdated ? new Date(c.lastUpdated).toISOString() : undefined]));
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

  // השלמת מועמדים לכל רשת: השאילתה המשותפת לעיל מוגבלת במספר כולל, ורשת עם
  // הרבה מוצרים דומים יכולה לדחוק החוצה רשתות אחרות - ואז הן "לא מזהות" את
  // המוצר. לכל רשת עם מעט מועמדים משלימים שאילתה ייעודית לרשת.
  const MIN_CANDIDATES_PER_CHAIN = 5;
  await Promise.all(
    uniqueNames.flatMap(name => {
      const tokens = getSearchTokensForName(name);
      if (tokens.length === 0) return [];
      const existing = candidatesByName.get(name) || [];
      return activeChains.filter(c => c.hasData).map(async c => {
        if (existing.filter(x => x.chainId === c.chainId).length >= MIN_CANDIDATES_PER_CHAIN) return;
        try {
          const extra = await PriceDAL.findByAnyToken(tokens, c.chainId, 60);
          const seen = new Set(existing.map(x => `${x.chainId}|${x.barcode}`));
          for (const item of extra) {
            if (!seen.has(`${item.chainId}|${item.barcode}`)) existing.push(item);
          }
        } catch {
          // השלמה נכשלה - ממשיכים עם מה שיש
        }
      });
    })
  );
  for (const name of uniqueNames) {
    if (!candidatesByName.has(name)) candidatesByName.set(name, []);
  }

  // שלב 1: התאמת שמות לכל רשת (עם הסניף הקרוב שיש לו נתוני מחיר)
  type ChainPhase = {
    chainId: ChainId; chainName: string; hasData: boolean;
    nearestBranch?: NearestBranch;
    cache?: Map<string, NameMatch>;
  };
  const phases: ChainPhase[] = await Promise.all(
    activeChains.map(async ({ chainId, chainName, hasData }): Promise<ChainPhase> => {
      const nearestBranch = await resolveBranchForChain(chainId, hasData, userLocation, chosenBranches?.[chainId]);
      if (!hasData) return { chainId, chainName, hasData, nearestBranch };

      const isPrimaryChain = chainId === BETA_CHAIN_ID;
      // עותק - העיגון לברקוד משותף משנה את המפה ואסור שישפיע על מטמון הרשימות
      if (isPrimaryChain && !nearestBranch) {
        return { chainId, chainName, hasData, nearestBranch, cache: new Map(nameMatchCache) };
      }
      const cache = new Map<string, NameMatch>();
      await Promise.all(
        uniqueNames.map(async name => {
          try {
            cache.set(name, await matchNormalizedName(name, chainId, chainName, candidatesByName.get(name) || [], nearestBranch?.storeId));
          } catch {
            cache.set(name, emptyMatch(chainId, chainName));
          }
        })
      );
      return { chainId, chainName, hasData, nearestBranch, cache };
    })
  );

  // שלב 2: עיגון לברקוד משותף, כדי שכל הרשתות ישוו את אותו מוצר בדיוק
  await applyBarcodeConsensus(phases, uniqueNames);
  // שלב 3: תיקוני המשתמש מנצחים הכול
  await Promise.all(phases.filter(p => p.cache).map(p =>
    applyOverridesToCache(p.cache!, overrideCtx, p.chainId, p.nearestBranch?.storeId)
  ));

  const chainTotals: PriceChainTotal[] = await Promise.all(
    phases.map(async ({ chainId, chainName, hasData, nearestBranch, cache }) => {
      // אם אין לרשת נתונים היום - מחזירים מיד כרטיס ריק (חוסך חישובים)
      if (!hasData || !cache) {
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
      const chainMatchCache = cache;

      let chainTotal = 0;
      let matched = 0;
      let unmatched = 0;
      let verified = 0;
      // בונים את הרשימה המפורטת של כל המוצרים של המשתמש עם המחיר ברשת הזו
      const chainMatches: PriceMatch[] = pendingProducts.map(p => {
        const nameMatch = chainMatchCache.get(p.name)!;
        if (nameMatch.matched) {
          chainTotal += nameMatch.price * (p.quantity || 1);
          matched += 1;
          if (nameMatch.priceVerifiedAtBranch) verified += 1;
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
        lastUpdatedISO: lastUpdatedMap.get(chainId),
        nearestBranch,
        branchVerifiedCount: nearestBranch ? verified : undefined,
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

// הסניף שלפיו מחשבים מחירים לרשת: בחירה ידנית של המשתמש אם קיימת ותקפה,
// אחרת הסניף הקרוב ביותר שיש לו נתוני מחיר. בלי מיקום ובלי בחירה - אין סניף.
export async function resolveBranchForChain(
  chainId: ChainId,
  hasData: boolean,
  userLocation?: UserLocation,
  chosenStoreId?: string
): Promise<NearestBranch | undefined> {
  if (!userLocation && !chosenStoreId) return undefined;
  const priced = hasData ? await BranchPriceDAL.storeIdsWithPrices(chainId).catch(() => undefined) : undefined;
  if (chosenStoreId) {
    const chosen = await getBranchByStore(chainId, chosenStoreId, userLocation, priced);
    if (chosen) return chosen;
  }
  if (!userLocation) return undefined;
  return (await findNearestBranch(chainId, userLocation, priced)) ?? undefined;
}

function emptyMatch(chainId: ChainId, chainName: string): NameMatch {
  return {
    normalizedName: '', matched: false, chainId, chainName,
    itemName: '', price: 0, barcode: '',
    matchConfidence: 0, matchedTokens: [], userTokens: [],
  };
}

// עיגון לברקוד משותף. כל רשת בוחרת מוצר לפי דמיון שם, ולכן רשתות שונות עלולות
// להתאים גרסאות שונות של אותו מוצר (גודל או מותג אחר), וההשוואה מטעה.
// לכל שם משתמש בוחרים את הברקוד ש-2 רשתות ומעלה התאימו אליו, ואז כל רשת
// שמחזיקה את אותו ברקוד מועברת אליו: אותו מוצר בדיוק בכל הרשתות, כולל רשתות
// שלא זיהו את המוצר לפי שם. ברקוד של מוצרי משקל הוא פנימי לרשת, ולכן הם
// נשארים עם ההתאמה לפי שם.
async function applyBarcodeConsensus(
  phases: Array<{ chainId: ChainId; chainName: string; hasData: boolean; nearestBranch?: NearestBranch; cache?: Map<string, NameMatch> }>,
  uniqueNames: string[]
): Promise<void> {
  const live = phases.filter(p => p.hasData && p.cache);
  if (live.length < 2) return;

  const consensusByName = new Map<string, { barcode: string; confidence: number; tokens: string[] }>();
  for (const name of uniqueNames) {
    const tally = new Map<string, { count: number; conf: number; tokens: string[] }>();
    for (const p of live) {
      const m = p.cache!.get(name);
      if (!m?.matched || !m.barcode) continue;
      const t = tally.get(m.barcode) ?? { count: 0, conf: 0, tokens: m.matchedTokens };
      t.count += 1;
      t.conf += m.matchConfidence;
      tally.set(m.barcode, t);
    }
    let top: { barcode: string; count: number; conf: number; tokens: string[] } | null = null;
    for (const [barcode, t] of tally) {
      if (t.count < 2) continue;
      if (!top || t.count > top.count || (t.count === top.count && t.conf > top.conf)) top = { barcode, ...t };
    }
    if (top) consensusByName.set(name, { barcode: top.barcode, confidence: top.conf / top.count, tokens: top.tokens });
  }
  if (consensusByName.size === 0) return;

  let docs: Awaited<ReturnType<typeof PriceDAL.findByBarcodes>>;
  try {
    docs = await PriceDAL.findByBarcodes(Array.from(new Set([...consensusByName.values()].map(c => c.barcode))));
  } catch {
    return; // אין עיגון - נשארים עם ההתאמה לפי שם
  }
  const docByKey = new Map(docs.map(d => [`${d.chainId}|${d.barcode}`, d]));

  await Promise.all(
    live.flatMap(p =>
      Array.from(consensusByName.entries()).map(async ([name, c]) => {
        const current = p.cache!.get(name);
        if (current?.matched && current.barcode === c.barcode) return;
        const doc = docByKey.get(`${p.chainId}|${c.barcode}`);
        if (!doc) return;
        try {
          const base = current ?? emptyMatch(p.chainId, p.chainName);
          p.cache!.set(name, await finalizeMatch(base, doc, c.confidence, c.tokens, p.chainId, p.nearestBranch?.storeId));
        } catch {
          // נשארים עם ההתאמה הקיימת
        }
      })
    )
  );
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
  // כשיש מחירים מאומתים בסניפים, משווים רק אותם: מחיר "הזול ברשת" הוא הטיה
  // כלפי מטה (הסניף הזול בארץ) ולא מה שהלקוח ישלם בסניף שלו. אם אין בכלל
  // מחירי סניף (למשל לא סונכרנו) נשארים עם ההשוואה הכלל-רשתית.
  const useVerifiedOnly = chainTotals.some(c => c.matches.some(m => m.matched && m.priceVerifiedAtBranch));
  const isComparable = (m: PriceMatch) => m.matched && (!useVerifiedOnly || !!m.priceVerifiedAtBranch);

  const withComparable = chainTotals.filter(c => c.hasData && c.matches.some(isComparable));
  if (withComparable.length === 0) return;
  // רשת שכיסתה רק חלק קטן מהסל לא נכנסת לדירוג: אחרת החיתוך המשותף קורס
  // לכמה מוצרים בודדים והדירוג של כל השאר נעשה חסר משמעות.
  const comparableCount = (c: PriceChainTotal) => c.matches.filter(isComparable).length;
  const maxComparable = withComparable.reduce((m, c) => Math.max(m, comparableCount(c)), 0);
  const dataChains = withComparable.filter(c => comparableCount(c) >= Math.ceil(maxComparable * MIN_RANKING_COVERAGE));

  const idSets = dataChains.map(c =>
    new Set(c.matches.filter(isComparable).map(m => m.productId))
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
        .filter(m => isComparable(m) && commonIds.has(m.productId))
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
