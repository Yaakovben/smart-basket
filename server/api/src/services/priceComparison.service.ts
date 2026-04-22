import { Product, Price } from '../models';
import { ListDAL, PriceDAL } from '../dal';
import { normalizeProductName } from '../chains';

export interface PriceMatch {
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

export interface PriceComparisonData {
  enabled: boolean;
  chainName: string;
  totalPrices: number;
  matchedCount: number;
  topMatches: PriceMatch[];
  estimatedBasketTotal: number | null;
  disclaimer: string;
  lastUpdatedISO: string | null;       // מתי המאגר עודכן לאחרונה
  sourceName: string;                   // מקור הנתונים
  sourceUrl: string;                    // URL למקור הציבורי
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

export class PriceComparisonService {
  // תובנות השוואת מחירים עבור משתמש — מבוסס על המוצרים הנקנים שלו
  static async getComparisonForUser(userId: string): Promise<PriceComparisonData> {
    const totalPrices = await PriceDAL.countByChain(BETA_CHAIN_ID);
    const lastUpdatedISO = totalPrices > 0 ? await getLastUpdatedISO() : null;

    const baseResponse = {
      chainName: BETA_CHAIN_NAME,
      sourceName: SOURCE_NAME,
      sourceUrl: SOURCE_URL,
      disclaimer: BASE_DISCLAIMER,
      lastUpdatedISO,
    };

    // אם אין נתונים עדיין, מחזירים מצב "מושבת"
    if (totalPrices === 0) {
      return {
        ...baseResponse,
        enabled: false,
        totalPrices: 0,
        matchedCount: 0,
        topMatches: [],
        estimatedBasketTotal: null,
        disclaimer: 'מאגר המחירים עדיין לא נטען. ייבוא נתונים ראשוני יתבצע בקרוב.',
      };
    }

    const lists = await ListDAL.findUserLists(userId);
    const listIds = lists.map(l => l._id);
    if (listIds.length === 0) {
      return {
        ...baseResponse,
        enabled: true,
        totalPrices,
        matchedCount: 0,
        topMatches: [],
        estimatedBasketTotal: null,
      };
    }

    // כל המוצרים של המשתמש (כולל לא-נקנים — אלה פוטנציאל קנייה)
    const allProducts = await Product.find({ listId: { $in: listIds } }).lean();
    if (allProducts.length === 0) {
      return {
        ...baseResponse,
        enabled: true,
        totalPrices,
        matchedCount: 0,
        topMatches: [],
        estimatedBasketTotal: null,
      };
    }

    // ספירת תדירות לכל שם מוצר (purchased נקנה בפועל)
    const countMap = new Map<string, { count: number; quantity: number }>();
    for (const p of allProducts) {
      if (!p.isPurchased) continue;
      const key = p.name.trim();
      const existing = countMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.quantity += p.quantity || 1;
      } else {
        countMap.set(key, { count: 1, quantity: p.quantity || 1 });
      }
    }
    // 10 המוצרים הנפוצים ביותר שהמשתמש קנה
    const topNames = Array.from(countMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, info]) => ({ name, ...info }));

    // נסיון התאמה לכל שם — חיפוש על הטוקן הראשון ואז דירוג לפי מילים חופפות
    const topMatches: PriceMatch[] = [];
    for (const tp of topNames) {
      const normalized = normalizeProductName(tp.name);
      if (!normalized) continue;
      const userTokensArr = normalized.split(' ').filter(Boolean);
      const userTokens = new Set(userTokensArr);
      // חיפוש מועמדים לפי המילה הראשונה
      const matches = await PriceDAL.findByNormalizedName(userTokensArr[0] || '', 'osher_ad', 20);

      let best: typeof matches[number] | null = null;
      let bestScore = 0;
      let bestMatchedTokens: string[] = [];
      for (const m of matches) {
        const chainTokens = (m.itemNameNormalized || '').split(' ').filter(Boolean);
        const matchedTokens: string[] = [];
        for (const t of chainTokens) {
          if (userTokens.has(t)) matchedTokens.push(t);
        }
        if (matchedTokens.length > bestScore) {
          bestScore = matchedTokens.length;
          best = m;
          bestMatchedTokens = matchedTokens;
        }
      }

      const confidence = userTokens.size > 0 ? bestScore / userTokens.size : 0;
      const threshold = Math.min(2, userTokens.size);

      if (best && bestScore >= threshold) {
        topMatches.push({
          userProductName: tp.name,
          userQuantity: tp.quantity,
          normalizedName: normalized,
          matched: true,
          chainId: best.chainId,
          chainName: best.chainName,
          itemName: best.itemName,
          itemNameNormalized: best.itemNameNormalized,
          price: best.price,
          barcode: best.barcode,
          matchConfidence: Math.round(confidence * 100) / 100,
          matchedTokens: bestMatchedTokens,
          userTokens: userTokensArr,
          manufacturerName: best.manufacturerName,
        });
      } else {
        topMatches.push({
          userProductName: tp.name,
          userQuantity: tp.quantity,
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
        });
      }
    }

    // סה"כ משוער של סל אם היו קונים את המוצרים המזוהים בכמויות שלהם
    const matched = topMatches.filter(m => m.matched);
    const estimatedBasketTotal = matched.length > 0
      ? matched.reduce((sum, m) => sum + m.price * m.userQuantity, 0)
      : null;

    return {
      ...baseResponse,
      enabled: true,
      totalPrices,
      matchedCount: matched.length,
      topMatches: topMatches.slice(0, 5),
      estimatedBasketTotal: estimatedBasketTotal ? Math.round(estimatedBasketTotal * 100) / 100 : null,
    };
  }
}
