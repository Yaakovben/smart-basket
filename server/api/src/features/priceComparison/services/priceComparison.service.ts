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

// ניסיון התאמה של שם מוצר בודד למאגר המחירים
async function tryMatchProduct(productId: string, name: string, quantity: number): Promise<PriceMatch> {
  const normalized = normalizeProductName(name);
  const userTokensArr = normalized ? normalized.split(' ').filter(Boolean) : [];
  const userTokens = new Set(userTokensArr);

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
    userTokens: userTokensArr,
  };

  if (!normalized || userTokensArr.length === 0) return unmatchedBase;

  // חיפוש מועמדים לפי המילה הראשונה
  const candidates = await PriceDAL.findByNormalizedName(userTokensArr[0], BETA_CHAIN_ID, 20);

  let best: typeof candidates[number] | null = null;
  let bestScore = 0;
  let bestMatchedTokens: string[] = [];
  for (const c of candidates) {
    const chainTokens = (c.itemNameNormalized || '').split(' ').filter(Boolean);
    const matched: string[] = [];
    for (const t of chainTokens) if (userTokens.has(t)) matched.push(t);
    if (matched.length > bestScore) {
      bestScore = matched.length;
      best = c;
      bestMatchedTokens = matched;
    }
  }

  const confidence = userTokens.size > 0 ? bestScore / userTokens.size : 0;
  const threshold = Math.min(2, userTokens.size);

  if (best && bestScore >= threshold) {
    return {
      ...unmatchedBase,
      matched: true,
      chainId: best.chainId,
      chainName: best.chainName,
      itemName: best.itemName,
      itemNameNormalized: best.itemNameNormalized,
      price: best.price,
      barcode: best.barcode,
      matchConfidence: Math.round(confidence * 100) / 100,
      matchedTokens: bestMatchedTokens,
      manufacturerName: best.manufacturerName,
    };
  }
  return unmatchedBase;
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
