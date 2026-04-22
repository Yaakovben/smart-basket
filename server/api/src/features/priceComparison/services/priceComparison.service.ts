import { Product } from '../../../models';
import { ListDAL } from '../../../dal';
import { Price } from '../models/Price.model';
import { PriceDAL } from '../dal/price.dal';
import { normalizeProductName } from '../chains';

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

export interface PriceComparisonData {
  enabled: boolean;
  chainName: string;
  totalPrices: number;          // כמה מוצרים יש במאגר הרשת
  lists: PriceListGroup[];      // חלוקה לפי רשימה
  grandTotal: number | null;    // סה"כ כל הרשימות
  totalMatched: number;         // סה"כ פריטים שזוהו בכל הרשימות
  totalUnmatched: number;       // סה"כ פריטים שלא זוהו
  totalPending: number;         // סה"כ פריטים שטרם נקנו
  disclaimer: string;
  lastUpdatedISO: string | null;
  sourceName: string;
  sourceUrl: string;
}

const BETA_CHAIN_ID = 'osher_ad';
const BETA_CHAIN_NAME = 'אושר עד';
const SOURCE_NAME = 'פורטל שקיפות המחירים הממשלתי';
const SOURCE_URL = 'https://url.publishedprices.co.il';

const BASE_DISCLAIMER = 'הנתונים מגיעים ממאגר השקיפות הציבורי של אושר עד. הפיצ\'ר בפיתוח - ההתאמה בין שמות המוצרים שלך למוצרי הרשת מבוססת על התאמת מילים ועשויה להיות לא מדויקת. מחירים מתעדכנים מדי יום.';

// מקבל את התאריך של הרשומה האחרונה שעודכנה במאגר — אינדיקטור לטריות הנתונים
async function getLastUpdatedISO(): Promise<string | null> {
  const latest = await Price.findOne({ chainId: BETA_CHAIN_ID }).sort({ updatedAt: -1 }).select('updatedAt').lean();
  return latest?.updatedAt ? new Date(latest.updatedAt).toISOString() : null;
}

// מסנן טוקנים: זורק מילים של אות אחת ומספרים בלבד (לא נושאי משמעות)
function meaningfulTokens(tokens: string[]): string[] {
  return tokens.filter(t => t.length >= 2 && !/^\d+$/.test(t));
}

// ניסיון התאמה של שם מוצר בודד למאגר המחירים
async function tryMatchProduct(productId: string, name: string, quantity: number): Promise<PriceMatch> {
  const normalized = normalizeProductName(name);
  const rawTokens = normalized ? normalized.split(' ').filter(Boolean) : [];
  const meaningful = meaningfulTokens(rawTokens);
  const userTokensForApi = rawTokens; // מציגים למשתמש את מה שהוא כתב
  const userSet = new Set(meaningful);

  const unmatchedBase: PriceMatch = {
    productId,
    userProductName: name,
    userQuantity: quantity,
    normalizedName: normalized,
    matched: false,
    chainId: BETA_CHAIN_ID,
    chainName: BETA_CHAIN_NAME,
    itemName: '',
    price: 0,
    barcode: '',
    matchConfidence: 0,
    matchedTokens: [],
    userTokens: userTokensForApi,
  };

  if (meaningful.length === 0) return unmatchedBase;

  // חיפוש מקבילי על עד 3 טוקנים המשמעותיים הראשונים, למיזוג מועמדים
  const searchTokens = meaningful.slice(0, 3);
  const candidateArrays = await Promise.all(
    searchTokens.map(t => PriceDAL.findByNormalizedName(t, BETA_CHAIN_ID, 30))
  );
  // דה-דופליקציה לפי _id
  const seen = new Set<string>();
  const candidates: typeof candidateArrays[number] = [];
  for (const arr of candidateArrays) {
    for (const c of arr) {
      const id = String(c._id);
      if (!seen.has(id)) { seen.add(id); candidates.push(c); }
    }
  }

  if (candidates.length === 0) return unmatchedBase;

  type Scored = { cand: typeof candidates[number]; score: number; matchedTokens: string[]; coverage: number };
  let best: Scored | null = null;

  for (const c of candidates) {
    const chainTokensRaw = (c.itemNameNormalized || '').split(' ').filter(Boolean);
    const chainMeaningful = meaningfulTokens(chainTokensRaw);
    if (chainMeaningful.length === 0) continue;

    const intersect: string[] = [];
    for (const t of chainMeaningful) if (userSet.has(t)) intersect.push(t);
    if (intersect.length === 0) continue;

    const userCoverage = intersect.length / userSet.size;          // כמה מהכוונה של המשתמש כוסתה
    const chainCoverage = intersect.length / chainMeaningful.length; // כמה ספציפי המוצר של הרשת
    // ציון משוכלל: מעדיף כיסוי של כוונת המשתמש, עם בונוס על ספציפיות
    let score = userCoverage * 0.7 + chainCoverage * 0.3;

    // בונוס: אם הנורמליזציה של המשתמש מופיעה כמחרוזת רציפה במוצר של הרשת
    if (normalized && c.itemNameNormalized && c.itemNameNormalized.includes(normalized)) {
      score += 0.15;
    }

    // בונוס קטן: אם כל הטוקנים של המשתמש נמצאו (כיסוי מלא של הכוונה)
    if (userCoverage >= 0.999) score += 0.05;

    if (!best || score > best.score) {
      best = { cand: c, score, matchedTokens: intersect, coverage: userCoverage };
    }
  }

  // סף התאמה: לפחות 50% מכוונת המשתמש חייבת לכוסות, וציון כולל הגיוני
  if (!best || best.coverage < 0.5 || best.score < 0.45) return unmatchedBase;

  const b = best.cand;
  return {
    ...unmatchedBase,
    matched: true,
    chainId: b.chainId,
    chainName: b.chainName,
    itemName: b.itemName,
    itemNameNormalized: b.itemNameNormalized,
    price: b.price,
    barcode: b.barcode,
    // ודאות שמוצגת למשתמש: מבוססת על כיסוי כוונת המשתמש (יותר אינטואיטיבי ממדד משוכלל)
    matchConfidence: Math.round(best.coverage * 100) / 100,
    matchedTokens: best.matchedTokens,
    manufacturerName: b.manufacturerName,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export class PriceComparisonService {
  // תובנות השוואת מחירים עבור משתמש — חלוקה לפי רשימה
  static async getComparisonForUser(userId: string): Promise<PriceComparisonData> {
    const totalPrices = await PriceDAL.countByChain(BETA_CHAIN_ID);
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
    };

    // אם אין נתונים עדיין, מחזירים מצב "מושבת"
    if (totalPrices === 0) {
      return {
        ...baseResponse,
        enabled: false,
        totalPrices: 0,
        disclaimer: 'מאגר המחירים עדיין לא נטען. ייבוא נתונים ראשוני יתבצע בקרוב.',
      };
    }

    const lists = await ListDAL.findUserLists(userId);
    if (lists.length === 0) {
      return { ...baseResponse, enabled: true, totalPrices };
    }

    // שליפת כל המוצרים שטרם נקנו בכל הרשימות, ב-query אחד (יעיל)
    const listIds = lists.map(l => l._id);
    const pendingProducts = await Product.find({
      listId: { $in: listIds },
      isPurchased: false,
    }).lean();

    if (pendingProducts.length === 0) {
      return { ...baseResponse, enabled: true, totalPrices };
    }

    // קיבוץ מוצרים לפי רשימה
    const productsByList = new Map<string, typeof pendingProducts>();
    for (const p of pendingProducts) {
      const key = String(p.listId);
      const arr = productsByList.get(key);
      if (arr) arr.push(p);
      else productsByList.set(key, [p]);
    }

    // עיבוד כל רשימה בנפרד
    const listGroups: PriceListGroup[] = [];
    for (const list of lists) {
      const listProducts = productsByList.get(String(list._id)) || [];
      if (listProducts.length === 0) continue; // רשימות ריקות לא מעניינות

      // התאמה לכל מוצר ברשימה
      const matches: PriceMatch[] = [];
      for (const p of listProducts) {
        const m = await tryMatchProduct(String(p._id), p.name, p.quantity || 1);
        matches.push(m);
      }

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

    return {
      ...baseResponse,
      enabled: true,
      totalPrices,
      lists: listGroups,
      grandTotal: totalMatched > 0 ? round2(grandTotal) : null,
      totalMatched,
      totalUnmatched,
      totalPending,
    };
  }
}
