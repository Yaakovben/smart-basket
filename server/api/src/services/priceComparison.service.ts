import { Product } from '../models';
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
  price: number;
  barcode: string;
}

export interface PriceComparisonData {
  enabled: boolean;
  chainName: string;
  totalPrices: number;
  matchedCount: number;
  topMatches: PriceMatch[];
  estimatedBasketTotal: number | null;
  disclaimer: string;
}

const BETA_CHAIN_ID = 'osher_ad';
const BETA_CHAIN_NAME = 'אושר עד';

export class PriceComparisonService {
  // תובנות השוואת מחירים עבור משתמש — מבוסס על המוצרים הנקנים שלו
  static async getComparisonForUser(userId: string): Promise<PriceComparisonData> {
    const totalPrices = await PriceDAL.countByChain(BETA_CHAIN_ID);

    // אם אין נתונים עדיין, מחזירים מצב "מושבת"
    if (totalPrices === 0) {
      return {
        enabled: false,
        chainName: BETA_CHAIN_NAME,
        totalPrices: 0,
        matchedCount: 0,
        topMatches: [],
        estimatedBasketTotal: null,
        disclaimer: 'מאגר המחירים עדיין לא נטען. יבוא נתונים ראשוני יתבצע בקרוב.',
      };
    }

    const lists = await ListDAL.findUserLists(userId);
    const listIds = lists.map(l => l._id);
    if (listIds.length === 0) {
      return {
        enabled: true,
        chainName: BETA_CHAIN_NAME,
        totalPrices,
        matchedCount: 0,
        topMatches: [],
        estimatedBasketTotal: null,
        disclaimer: 'הנתונים מגיעים ממאגר השקיפות של אושר עד ומתעדכנים מדי יום. פיצ\'ר בפיתוח, ייתכנו אי דיוקים.',
      };
    }

    // כל המוצרים של המשתמש (כולל לא-נקנים — אלה פוטנציאל קנייה)
    const allProducts = await Product.find({ listId: { $in: listIds } }).lean();
    if (allProducts.length === 0) {
      return {
        enabled: true,
        chainName: BETA_CHAIN_NAME,
        totalPrices,
        matchedCount: 0,
        topMatches: [],
        estimatedBasketTotal: null,
        disclaimer: 'הנתונים מגיעים ממאגר השקיפות של אושר עד ומתעדכנים מדי יום. פיצ\'ר בפיתוח, ייתכנו אי דיוקים.',
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

    // נסיון התאמה לכל שם — תחילה בהחזר ממאגר על נירמול
    const topMatches: PriceMatch[] = [];
    for (const tp of topNames) {
      const normalized = normalizeProductName(tp.name);
      if (!normalized) continue;
      // בחיפוש הנוכחי אנחנו עושים לפי שם כי אין לנו ברקוד בצד המשתמש. נחזיר את הראשון הכי קרוב.
      const matches = await PriceDAL.findByNormalizedName(normalized.split(' ')[0], 'osher_ad', 10);
      // מציאת ההתאמה הטובה ביותר לפי מילים חופפות
      const userTokens = new Set(normalized.split(' ').filter(Boolean));
      let best: typeof matches[number] | null = null;
      let bestScore = 0;
      for (const m of matches) {
        const chainTokens = (m.itemNameNormalized || '').split(' ').filter(Boolean);
        let score = 0;
        for (const t of chainTokens) if (userTokens.has(t)) score += 1;
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }
      if (best && bestScore >= Math.min(2, userTokens.size)) {
        topMatches.push({
          userProductName: tp.name,
          userQuantity: tp.quantity,
          normalizedName: normalized,
          matched: true,
          chainId: best.chainId,
          chainName: best.chainName,
          itemName: best.itemName,
          price: best.price,
          barcode: best.barcode,
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
        });
      }
    }

    // סה"כ משוער של סל אם היו קונים את המוצרים המזוהים בכמויות שלהם
    const matched = topMatches.filter(m => m.matched);
    const estimatedBasketTotal = matched.length > 0
      ? matched.reduce((sum, m) => sum + m.price * m.userQuantity, 0)
      : null;

    return {
      enabled: true,
      chainName: BETA_CHAIN_NAME,
      totalPrices,
      matchedCount: matched.length,
      topMatches: topMatches.slice(0, 5),
      estimatedBasketTotal: estimatedBasketTotal ? Math.round(estimatedBasketTotal * 100) / 100 : null,
      disclaimer: 'הנתונים מגיעים ממאגר השקיפות של אושר עד ומתעדכנים מדי יום. פיצ\'ר בפיתוח, ייתכנו אי דיוקים בהתאמת השמות.',
    };
  }
}
