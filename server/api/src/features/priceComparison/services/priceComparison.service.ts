import { Product } from '../../../models';
import { ListDAL } from '../../../dal';
import { Price } from '../models/Price.model';
import { PriceDAL } from '../dal/price.dal';
import { getCachedComparison, setCachedComparison } from './comparisonCache';
import { matchNormalizedName, BETA_CHAIN_ID, BETA_CHAIN_NAME, type NameMatch } from './productMatcher';
import { buildChainTotals, type PendingProductLean } from './chainComparison';
import type { UserLocation } from './branches.service';
import type { PriceMatch, PriceListGroup, PriceChainTotal, PriceComparisonData } from './priceComparison.types';

export type { PriceMatch, PriceListGroup, PriceChainTotal, PriceComparisonData } from './priceComparison.types';
export { invalidateUser, invalidateAllUsers } from './comparisonCache';

const SOURCE_NAME = 'פורטל שקיפות המחירים הממשלתי';
const SOURCE_URL = 'https://url.publishedprices.co.il';
const BASE_DISCLAIMER = 'הנתונים מגיעים ממאגר השקיפות הציבורי של אושר עד. הפיצ\'ר בפיתוח - ההתאמה בין שמות המוצרים שלך למוצרי הרשת מבוססת על התאמת מילים ועשויה להיות לא מדויקת. מחירים מתעדכנים מדי יום.';

const round2 = (n: number) => Math.round(n * 100) / 100;

// מקבל את התאריך של הרשומה האחרונה שעודכנה במאגר — אינדיקטור לטריות הנתונים.
// בודק על פני כל הרשתות, לא רק הראשית.
async function getLastUpdatedISO(): Promise<string | null> {
  const latest = await Price.findOne({}).sort({ updatedAt: -1 }).select('updatedAt').lean();
  return latest?.updatedAt ? new Date(latest.updatedAt).toISOString() : null;
}

// בונה את קבוצות ה-PriceListGroup (חלוקה לפי רשימה, ברשת הראשית בלבד).
function buildListGroups(
  lists: Array<{ _id: unknown; name: string; icon?: string; color?: string; isGroup?: boolean }>,
  productsByList: Map<string, PendingProductLean[]>,
  nameMatchCache: Map<string, NameMatch>
): PriceListGroup[] {
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
  return listGroups;
}

// תובנות השוואת מחירים עבור משתמש.
// filterListId אופציונלי - אם מועבר, מחשב רק את המוצרים של הרשימה הזו.
// userLocation אופציונלי - אם מועבר, מצרף לכל רשת את הסניף הקרוב ביותר ואת המרחק.
export async function getComparisonForUser(
  userId: string,
  filterListId?: string,
  userLocation?: UserLocation
): Promise<PriceComparisonData> {
  // מפתח מטמון שונה לכל שילוב user+list+location(מעוגל ל-500מ') כדי למנוע ערבוב.
  // עיגול המיקום ל-3 ספרות אחרי הנקודה (~110 מ') מונע פסילת מטמון על כל תזוזה קטנה.
  const locKey = userLocation
    ? `:${userLocation.lat.toFixed(3)},${userLocation.lng.toFixed(3)}`
    : '';
  const cacheKey = filterListId ? `${userId}:${filterListId}${locKey}` : `${userId}${locKey}`;
  const cached = getCachedComparison(cacheKey);
  if (cached) return cached;

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

  const cacheAndReturn = (data: PriceComparisonData): PriceComparisonData =>
    setCachedComparison(cacheKey, data);

  // אם אין נתונים עדיין, מחזירים מצב "מושבת"
  if (totalPrices === 0) {
    return cacheAndReturn({
      ...baseResponse,
      enabled: false,
      totalPrices: 0,
      disclaimer: 'מאגר המחירים עדיין לא נטען. ייבוא נתונים ראשוני יתבצע בקרוב.',
    });
  }

  const allLists = await ListDAL.findUserLists(userId);
  if (allLists.length === 0) {
    return cacheAndReturn({ ...baseResponse, enabled: true, totalPrices });
  }

  // אם ביקשו רשימה ספציפית - מסננים. אחרת - כל הרשימות של המשתמש.
  const lists = filterListId
    ? allLists.filter(l => String(l._id) === filterListId)
    : allLists;

  if (lists.length === 0) {
    // רשימה שהתבקשה לא שייכת למשתמש או לא קיימת
    return cacheAndReturn({ ...baseResponse, enabled: true, totalPrices });
  }

  // שליפת כל המוצרים שטרם נקנו (רק ברשימות שנבחרו)
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
    const listProducts = productsByList.get(key);
    if (listProducts) listProducts.push(p);
    else productsByList.set(key, [p]);
  }

  const listGroups = buildListGroups(lists, productsByList, nameMatchCache);

  // אגרגציה גלובלית
  const totalMatched = listGroups.reduce((s, g) => s + g.matchedCount, 0);
  const totalUnmatched = listGroups.reduce((s, g) => s + g.unmatchedCount, 0);
  const totalPending = listGroups.reduce((s, g) => s + g.pendingCount, 0);
  const grandTotal = listGroups.reduce((s, g) => s + g.estimatedTotal, 0);

  // השוואה רב-רשתית: לכל רשת פעילה, סך הסל + "הכי זול"/"סל שלם"
  const chainTotals = await buildChainTotals(pendingProducts, uniqueNames, nameMatchCache, userLocation);

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
