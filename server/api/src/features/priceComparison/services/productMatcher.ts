import type { ChainId } from '../models/Price.model';
import { PriceDAL } from '../dal/price.dal';
import { normalizeProductName, stemHebrew } from '../chains';
import type { PriceMatch } from './priceComparison.types';

export const BETA_CHAIN_ID: ChainId = 'osher_ad';
export const BETA_CHAIN_NAME = 'אושר עד';

// תוצאת התאמה מופשטת - ללא productId/quantity ששייכים לשורה הספציפית.
// זה מאפשר לקשט את אותה "התאמת שם" להרבה מוצרים ללא שאילתות חוזרות.
export type NameMatch = Omit<PriceMatch, 'productId' | 'userProductName' | 'userQuantity'>;

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

// פונקציה עזר: מחזירה את הטוקנים המשמעותיים של שם לשימוש בחיפוש המוני.
// חשוף כדי שה-caller יוכל להזמין batch של candidates פעם אחת.
export function getSearchTokensForName(userName: string): string[] {
  const normalized = normalizeProductName(userName);
  const rawTokens = normalized ? normalized.split(' ').filter(Boolean) : [];
  const meaningful = meaningfulTokens(rawTokens);
  return meaningful.slice(0, 3);
}

// ניסיון התאמה של שם מנורמל בודד למאגר (ללא productId/quantity).
// preFetchedCandidates אופציונלי: אם מועבר, חוסך את הפנייה ל-DB (מאפשר batching בקריאות רבות).
export async function matchNormalizedName(
  userName: string,
  chainId: ChainId = BETA_CHAIN_ID,
  chainName: string = BETA_CHAIN_NAME,
  preFetchedCandidates?: Awaited<ReturnType<typeof PriceDAL.findByAnyToken>>,
): Promise<NameMatch> {
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

  const longestUserToken = meaningful.reduce((a, b) => (a.length >= b.length ? a : b));
  const longestUserStem = stemHebrew(longestUserToken);

  const userStemMap = new Map<string, string>();
  for (const t of meaningful) userStemMap.set(stemHebrew(t), t);

  const minRequiredMatches = Math.min(meaningful.length, 2);

  let candidates: Awaited<ReturnType<typeof PriceDAL.findByAnyToken>>;
  if (preFetchedCandidates) {
    // הצרכן סיפק candidates - סינון לפי רשת יחידה אם צוינה
    candidates = preFetchedCandidates.filter(c => c.chainId === chainId);
  } else {
    const searchTokens = meaningful.slice(0, 3);
    try {
      candidates = await PriceDAL.findByAnyToken(searchTokens, chainId, 60);
    } catch {
      return unmatched;
    }
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
