import { Product } from '../../../models';
import { ListDAL } from '../../../dal';
import { Price } from '../models/Price.model';
import { PriceDAL } from '../dal/price.dal';
import { normalizeProductName, stemHebrew } from '../chains';

export interface PriceMatch {
  productId: string;
  userProductName: string;
  userQuantity: number;
  normalizedName: string;
  matched: boolean;
  chainId: string;
  chainName: string;
  itemName: string;
  itemNameNormalized?: string;
  price: number;
  barcode: string;
  matchConfidence: number; // 0 עד 1 — אחוז ה-tokens של המשתמש שנמצאו במוצר
  matchedTokens: string[];
  userTokens: string[];
  manufacturerName?: string;
}

// קבוצת פריטים לפי רשימה - זה ה-unit המרכזי החדש
export interface PriceListGroup {
  listId: string;
  listName: string;
  listIcon: string;
  listColor: string;
  isGroup: boolean;
  pendingCount: number;         // סה"כ פריטים ברשימה שטרם נקנו
  matchedCount: number;         // כמה מהם זוהו
  unmatchedCount: number;       // כמה לא זוהו
  estimatedTotal: number;       // סה"כ לפריטים שזוהו בלבד
  matches: PriceMatch[];        // הפירוט (כל הפריטים, זוהו + לא זוהו)
}

// סיכום עלות סל לרשת אחת - משמש לתצוגה השוואתית בין רשתות
export interface PriceChainTotal {
  chainId: string;
  chainName: string;
  total: number;         // סה"כ משוער (רק מוצרים שזוהו)
  matchedCount: number;  // כמה מוצרים מהרשימות של המשתמש נמצאו ברשת
  unmatchedCount: number;
  isCheapest: boolean;   // רשת אחת מסומנת כזולה ביותר
  savings: number;       // כמה חוסכים לעומת הרשת היקרה ביותר (₪)
}

export interface PriceComparisonData {
  enabled: boolean;
  chainName: string;            // הרשת ה"ראשית" (הזולה ביותר) - לתאימות אחורה
  totalPrices: number;          // כמה מוצרים יש במאגר של הרשת הראשית
  lists: PriceListGroup[];      // חלוקה לפי רשימה (ע"פ הרשת הראשית)
  grandTotal: number | null;    // סה"כ כל הרשימות (בערך של הרשת הראשית)
  totalMatched: number;
  totalUnmatched: number;
  totalPending: number;
  chainTotals: PriceChainTotal[]; // השוואה בין כל הרשתות הפעילות (ממוין מהזולה ליקרה)
  disclaimer: string;
  lastUpdatedISO: string | null;
  sourceName: string;
  sourceUrl: string;
}

const BETA_CHAIN_ID = 'osher_ad';
const BETA_CHAIN_NAME = 'אושר עד';
import type { ChainId } from '../models/Price.model';
const SOURCE_NAME = 'פורטל שקיפות המחירים הממשלתי';
const SOURCE_URL = 'https://url.publishedprices.co.il';

const BASE_DISCLAIMER = 'הנתונים מגיעים ממאגר השקיפות הציבורי של אושר עד. הפיצ\'ר בפיתוח - ההתאמה בין שמות המוצרים שלך למוצרי הרשת מבוססת על התאמת מילים ועשויה להיות לא מדויקת. מחירים מתעדכנים מדי יום.';

// מקבל את התאריך של הרשומה האחרונה שעודכנה במאגר — אינדיקטור לטריות הנתונים.
// בודק על פני כל הרשתות, לא רק הראשית.
async function getLastUpdatedISO(): Promise<string | null> {
  const latest = await Price.findOne({}).sort({ updatedAt: -1 }).select('updatedAt').lean();
  return latest?.updatedAt ? new Date(latest.updatedAt).toISOString() : null;
}

// מסנן טוקנים: זורק מילים של אות אחת ומספרים בלבד (לא נושאי משמעות)
function meaningfulTokens(tokens: string[]): string[] {
  return tokens.filter(t => t.length >= 2 && !/^\d+$/.test(t));
}

// מילות-מקדם שמופיעות בתחילת שם מוצר כדי לציין קטגוריה-צד (לא הקטגוריה הרגילה).
// אם המשתמש לא ביקש אחת מהן אבל המוצר ברשת מתחיל איתה — סיכוי גבוה שזה לא מה שרצה.
// דוג׳: משתמש מבקש "חלב" → מוצר "שוקולד חלב" מתחיל ב"שוקולד" (סטייה מהקטגוריה).
const CATEGORY_MODIFIERS = new Set([
  'שוקולד', 'שוקו', 'משקה', 'מיץ', 'אבקת', 'אבקה', 'סירופ',
  'ריבת', 'ריבה', 'מרק', 'מרקים', 'דייסת', 'דייסה', 'מחית',
  'ממרח', 'קצף', 'גלידת', 'גלידה', 'עוגת', 'עוגה', 'עוגיות',
  'ביסקוויט', 'ביסקוויטים', 'קרקר', 'קרקרים', 'תבלין', 'תבלינים',
  'מאפה', 'מאפי', 'רוטב', 'רטבי', 'תחליף', 'שמנת',
]);

// תוצאת התאמה מופשטת - ללא productId/quantity ששייכים לשורה הספציפית.
// זה מאפשר לקשט את אותה "התאמת שם" להרבה מוצרים ללא שאילתות חוזרות.
type NameMatch = Omit<PriceMatch, 'productId' | 'userProductName' | 'userQuantity'>;

// ניסיון התאמה של שם מנורמל בודד למאגר (ללא productId/quantity).
// chainId אופציונלי: אם מועבר — מתאים רק לרשת ההיא; אם undefined — חוצה רשתות.
async function matchNormalizedName(userName: string, chainId: ChainId = BETA_CHAIN_ID, chainName: string = BETA_CHAIN_NAME): Promise<NameMatch> {
  const normalized = normalizeProductName(userName);
  const rawTokens = normalized ? normalized.split(' ').filter(Boolean) : [];
  const meaningful = meaningfulTokens(rawTokens);
  const userSet = new Set(meaningful);

  const unmatched: NameMatch = {
    normalizedName: normalized,
    matched: false,
    chainId,
    chainName,
    itemName: '',
    price: 0,
    barcode: '',
    matchConfidence: 0,
    matchedTokens: [],
    userTokens: rawTokens,
  };

  if (meaningful.length === 0) return unmatched;

  // "טוקן עוגן" = המילה הארוכה ביותר של המשתמש. מילים ארוכות הן יותר ספציפיות
  // בעברית (קנולה > שמן, עגבנייה > ירק), ולכן חייבות להופיע במוצר של הרשת.
  const longestUserToken = meaningful.reduce((a, b) => (a.length >= b.length ? a : b));
  const longestUserStem = stemHebrew(longestUserToken);

  // מפה מ-stem → מילה מקורית של המשתמש. מאפשרת התאמה של וריאנטים:
  // "גבינה" של המשתמש נתפסת כ-"גבינת" ברשת כי שניהם נגזרים ל-"גבינ".
  const userStemMap = new Map<string, string>();
  for (const t of meaningful) userStemMap.set(stemHebrew(t), t);

  // סף קשיח: לפחות 2 טוקנים תואמים (או כולם אם יש פחות מ-2 במשתמש).
  const minRequiredMatches = Math.min(meaningful.length, 2);

  // שאילתה אחת עם $or על עד 3 טוקנים (במקום 3 שאילתות מקבילות)
  const searchTokens = meaningful.slice(0, 3);
  let candidates: Awaited<ReturnType<typeof PriceDAL.findByAnyToken>> = [];
  try {
    candidates = await PriceDAL.findByAnyToken(searchTokens, chainId, 60);
  } catch {
    return unmatched;
  }
  if (candidates.length === 0) return unmatched;

  type Scored = { cand: typeof candidates[number]; score: number; matchedTokens: string[]; coverage: number };
  let best: Scored | null = null;

  for (const c of candidates) {
    const chainTokensRaw = (c.itemNameNormalized || '').split(' ').filter(Boolean);
    const chainMeaningful = meaningfulTokens(chainTokensRaw);
    if (chainMeaningful.length === 0) continue;

    // התאמה בשתי רמות: קודם התאמה מדויקת, אחר-כך התאמה לפי שורש
    // לכיסוי "גבינה ↔ גבינת", "עגבניה ↔ עגבניות", "לבנה ↔ לבנת" וכד׳.
    const intersectSet = new Set<string>(); // שומר מילים של המשתמש (לא של הרשת) כדי שהעוגן ייבדק נכון
    let anchorMatched = false;
    for (const t of chainMeaningful) {
      // רמה 1: התאמה מדויקת
      if (userSet.has(t)) {
        intersectSet.add(t);
        if (t === longestUserToken) anchorMatched = true;
        continue;
      }
      // רמה 2: התאמה לפי שורש (רק אם באמת הייתה גזעה - stemHebrew שינה את המילה)
      const chainStem = stemHebrew(t);
      if (chainStem !== t) {
        const matchedUserWord = userStemMap.get(chainStem);
        if (matchedUserWord) {
          intersectSet.add(matchedUserWord);
          if (matchedUserWord === longestUserToken || chainStem === longestUserStem) {
            anchorMatched = true;
          }
        }
      }
    }
    const intersect = Array.from(intersectSet);

    // שתי מחסומים: מינימום טוקנים תואמים, וחובה שהעוגן יהיה בהצטלבות.
    if (intersect.length < minRequiredMatches) continue;
    if (!anchorMatched) continue;

    const userCoverage = intersect.length / userSet.size;
    const chainCoverage = intersect.length / chainMeaningful.length;
    let score = userCoverage * 0.7 + chainCoverage * 0.3;

    // בונוס: נורמליזציה של המשתמש מופיעה כמחרוזת רציפה במוצר הרשת
    if (normalized && c.itemNameNormalized && c.itemNameNormalized.includes(normalized)) {
      score += 0.15;
    }
    // בונוס: כל הטוקנים של המשתמש מופיעים במוצר (כיסוי מלא של הכוונה)
    if (userCoverage >= 0.999) score += 0.15;
    // בונוס: היצרן של המוצר ברשת מופיע בשם של המשתמש (למשל "חלב טרה")
    if (c.manufacturerName) {
      const manufNorm = normalizeProductName(c.manufacturerName);
      if (manufNorm && userSet.has(manufNorm)) score += 0.2;
    }

    // בונוס חזק: המוצר ברשת מתחיל באחת ממילות המשתמש (הקטגוריה העיקרית שלו).
    // דוג׳: משתמש מבקש "חלב" → מעדיפים "חלב 3% 1ל" על פני "שוקולד חלב 500מל".
    const chainFirstToken = chainMeaningful[0];
    if (chainFirstToken && userSet.has(chainFirstToken)) {
      score += 0.2;
    }

    // קנס כבד: המוצר מתחיל במילת-מקדם (שוקולד/ריבה/תבלין/...) שהמשתמש לא ביקש.
    // זה מונע סטייה לקטגוריה-צד כשהמשתמש ביקש את הקטגוריה הרגילה.
    if (chainFirstToken && !userSet.has(chainFirstToken) && CATEGORY_MODIFIERS.has(chainFirstToken)) {
      score -= 0.3;
    }

    if (!best || score > best.score ||
        // שובר-שוויון: בציון דומה (עד 0.05 פער) מעדיפים את הזול יותר —
        // משתמשים מצפים למוצר הבסיסי לשאילתות כלליות ("נקניק" = לא ב-100 ש"ח).
        (Math.abs(score - best.score) < 0.05 && c.price < best.cand.price)) {
      best = { cand: c, score, matchedTokens: intersect, coverage: userCoverage };
    }
  }

  // סף ציון כולל מחמיר יותר אחרי המחסומים הקשיחים
  if (!best || best.score < 0.55) return unmatched;

  const b = best.cand;
  return {
    ...unmatched,
    matched: true,
    chainId: b.chainId,
    chainName: b.chainName,
    itemName: b.itemName,
    itemNameNormalized: b.itemNameNormalized,
    price: b.price,
    barcode: b.barcode,
    matchConfidence: Math.round(best.coverage * 100) / 100,
    matchedTokens: best.matchedTokens,
    manufacturerName: b.manufacturerName,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// מטמון קצר-טווח לכל משתמש - חוסך חישובים חוזרים בפתיחות מהירות של העמוד
const CACHE_TTL_MS = 60_000;
const userCache = new Map<string, { data: PriceComparisonData; expiresAt: number }>();

// מנקה מטמון של משתמש ספציפי - חשוב לקרוא כשנוצר/נמחק/נקנה מוצר
export function invalidateUser(userId: string): void {
  userCache.delete(userId);
}

// תובנות השוואת מחירים עבור משתמש — חלוקה לפי רשימה
export async function getComparisonForUser(userId: string): Promise<PriceComparisonData> {
    // מטמון: אם הבקשה הקודמת הייתה לאחרונה, מחזירים מייד
    const cached = userCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    // סופרים את כל המאגר — לא רק רשת אחת. אם לפחות רשת אחת יש בה נתונים,
    // הפיצ'ר נחשב "זמין" ומציגים את ההשוואה.
    const allChainsCounts = await PriceDAL.getActiveChainsWithCounts();
    const totalPrices = allChainsCounts.reduce((sum, c) => sum + c.count, 0);
    const lastUpdatedISO = totalPrices > 0 ? await getLastUpdatedISO() : null;

    const baseResponse = {
      chainName: BETA_CHAIN_NAME,
      sourceName: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      disclaimer: BASE_DISCLAIMER,
      lastUpdatedISO,
      lists: [],
      grandTotal: null,
      totalMatched: 0,
      totalUnmatched: 0,
      totalPending: 0,
      chainTotals: [] as PriceChainTotal[],
    };

    const cacheAndReturn = (data: PriceComparisonData): PriceComparisonData => {
      userCache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    };

    // אם אין נתונים עדיין, מחזירים מצב "מושבת"
    if (totalPrices === 0) {
      return cacheAndReturn({
        ...baseResponse,
        enabled: false,
        totalPrices: 0,
        disclaimer: 'מאגר המחירים עדיין לא נטען. ייבוא נתונים ראשוני יתבצע בקרוב.',
      });
    }

    const lists = await ListDAL.findUserLists(userId);
    if (lists.length === 0) {
      return cacheAndReturn({ ...baseResponse, enabled: true, totalPrices });
    }

    // שליפת כל המוצרים שטרם נקנו בכל הרשימות, ב-query אחד (יעיל)
    const listIds = lists.map(l => l._id);
    const pendingProducts = await Product.find({
      listId: { $in: listIds },
      isPurchased: false,
    }).select('_id name quantity listId').lean();

    if (pendingProducts.length === 0) {
      return cacheAndReturn({ ...baseResponse, enabled: true, totalPrices });
    }

    // דה-דופליקציה לפי שם מנורמל: פריט "חלב 3%" שמופיע ב-5 רשימות — match רץ פעם אחת בלבד
    const nameMatchCache = new Map<string, NameMatch>();
    const uniqueNames = Array.from(new Set(pendingProducts.map(p => p.name)));
    // ריצה מקבילה על שמות ייחודיים
    await Promise.all(
      uniqueNames.map(async name => {
        try {
          const m = await matchNormalizedName(name);
          nameMatchCache.set(name, m);
        } catch {
          // שגיאה בהתאמה בודדת - ממלאים ב-unmatched ולא מפילים את כל הבקשה
          nameMatchCache.set(name, {
            normalizedName: '', matched: false,
            chainId: BETA_CHAIN_ID, chainName: BETA_CHAIN_NAME,
            itemName: '', price: 0, barcode: '',
            matchConfidence: 0, matchedTokens: [], userTokens: [],
          });
        }
      })
    );

    // קיבוץ מוצרים לפי רשימה
    const productsByList = new Map<string, typeof pendingProducts>();
    for (const p of pendingProducts) {
      const key = String(p.listId);
      const arr = productsByList.get(key);
      if (arr) arr.push(p);
      else productsByList.set(key, [p]);
    }

    // בניית קבוצות לפי רשימה - לא דורש async כבר (הכל במטמון)
    const listGroups: PriceListGroup[] = [];
    for (const list of lists) {
      const listProducts = productsByList.get(String(list._id)) || [];
      if (listProducts.length === 0) continue;

      const matches: PriceMatch[] = listProducts.map(p => {
        const nameMatch = nameMatchCache.get(p.name)!;
        return {
          ...nameMatch,
          productId: String(p._id),
          userProductName: p.name,
          userQuantity: p.quantity || 1,
        };
      });

      // מיון בתוך הרשימה: קודם זוהו (לפי סכום יורד), אחר כך לא זוהו
      matches.sort((a, b) => {
        if (a.matched !== b.matched) return a.matched ? -1 : 1;
        if (a.matched) return (b.price * b.userQuantity) - (a.price * a.userQuantity);
        return 0;
      });

      const matchedOnly = matches.filter(m => m.matched);
      const estimatedTotal = matchedOnly.reduce((s, m) => s + m.price * m.userQuantity, 0);

      listGroups.push({
        listId: String(list._id),
        listName: list.name,
        listIcon: list.icon || '🛒',
        listColor: list.color || '#14B8A6',
        isGroup: !!list.isGroup,
        pendingCount: matches.length,
        matchedCount: matchedOnly.length,
        unmatchedCount: matches.length - matchedOnly.length,
        estimatedTotal: round2(estimatedTotal),
        matches,
      });
    }

    // מיון: רשימות עם יותר פריטים/יותר כסף בראש
    listGroups.sort((a, b) => b.estimatedTotal - a.estimatedTotal || b.pendingCount - a.pendingCount);

    // אגרגציה גלובלית
    const totalMatched = listGroups.reduce((s, g) => s + g.matchedCount, 0);
    const totalUnmatched = listGroups.reduce((s, g) => s + g.unmatchedCount, 0);
    const totalPending = listGroups.reduce((s, g) => s + g.pendingCount, 0);
    const grandTotal = listGroups.reduce((s, g) => s + g.estimatedTotal, 0);

    // ======================================================================
    // השוואה רב-רשתית: לכל רשת פעילה, מחשבים את סך הסל במקביל.
    // משתמשים ב-uniqueNames (שכבר יש לנו) כדי לרוץ match לכל צירוף שם×רשת.
    // ======================================================================
    const activeChains = await PriceDAL.getActiveChainsWithCounts();
    const chainTotals: PriceChainTotal[] = await Promise.all(
      activeChains.map(async ({ chainId, chainName }) => {
        // לרשת "הראשית" (BETA) - יש לנו כבר matchCache, לא לבצע פעם שנייה
        const isPrimaryChain = chainId === BETA_CHAIN_ID;

        const chainMatchCache = isPrimaryChain
          ? nameMatchCache
          : await (async () => {
              const cache = new Map<string, NameMatch>();
              await Promise.all(
                uniqueNames.map(async name => {
                  try {
                    cache.set(name, await matchNormalizedName(name, chainId, chainName));
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
        for (const p of pendingProducts) {
          const m = chainMatchCache.get(p.name)!;
          if (m.matched) {
            chainTotal += m.price * (p.quantity || 1);
            matched += 1;
          } else {
            unmatched += 1;
          }
        }

        return {
          chainId,
          chainName,
          total: round2(chainTotal),
          matchedCount: matched,
          unmatchedCount: unmatched,
          isCheapest: false,
          savings: 0,
        };
      })
    );

    // סימון הזולה ביותר + חישוב חיסכון לעומת היקרה (רק רשתות עם לפחות התאמה אחת)
    const chainsWithMatches = chainTotals.filter(c => c.matchedCount > 0);
    if (chainsWithMatches.length > 0) {
      const sorted = [...chainsWithMatches].sort((a, b) => a.total - b.total);
      const cheapestId = sorted[0].chainId;
      const maxTotal = sorted[sorted.length - 1].total;
      for (const ct of chainTotals) {
        if (ct.chainId === cheapestId) ct.isCheapest = true;
        if (ct.matchedCount > 0) ct.savings = round2(maxTotal - ct.total);
      }
    }
    // מיון: זולה ביותר קודם, ואז לפי חיסכון יורד. רשתות ללא התאמה בסוף.
    chainTotals.sort((a, b) => {
      if (a.matchedCount === 0 && b.matchedCount > 0) return 1;
      if (b.matchedCount === 0 && a.matchedCount > 0) return -1;
      return a.total - b.total;
    });

    return cacheAndReturn({
      ...baseResponse,
      enabled: true,
      totalPrices,
      lists: listGroups,
      grandTotal: totalMatched > 0 ? round2(grandTotal) : null,
      totalMatched,
      totalUnmatched,
      totalPending,
      chainTotals,
    });
}
