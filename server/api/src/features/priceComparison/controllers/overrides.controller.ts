import type { Response } from 'express';
import { PriceDAL } from '../dal/price.dal';
import { PriceMatchOverrideDAL, MAX_OVERRIDES_PER_USER } from '../dal/priceMatchOverride.dal';
import { overrideKey } from '../services/matchOverrides';
import { getSearchTokensForName } from '../services/productMatcher';
import { invalidateUser } from '../services/priceComparison.service';
import { asyncHandler } from '../../../utils';
import type { AuthRequest } from '../../../types';

const SEARCH_MAX_QUERY_LENGTH = 80;
const SEARCH_RESULT_LIMIT = 15;
// כמה מועמדים לשלוף לפני איחוד לפי ברקוד. גבוה כי אותו מוצר חוזר בכל רשת.
const SEARCH_CANDIDATE_LIMIT = 120;
const BARCODE_PATTERN = /^[0-9A-Za-z-]{1,40}$/;

export interface ProductSearchResult {
  barcode: string;
  itemName: string;
  manufacturerName?: string;
  // בכמה רשתות המוצר נמצא, והמחיר הנמוך ביותר ביניהן
  chainCount: number;
  minPrice: number;
}

// GET /api/price-comparison/search?q=  - חיפוש מוצר לבחירה ידנית כשההתאמה האוטומטית טעתה.
// מאחד לפי ברקוד כך שכל מוצר מופיע פעם אחת, עם מספר הרשתות שמוכרות אותו
// (מוצר שנמצא ביותר רשתות = השוואה משמעותית יותר, לכן מופיע ראשון).
export const searchProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, SEARCH_MAX_QUERY_LENGTH) : '';
  const tokens = getSearchTokensForName(q);
  if (tokens.length === 0) {
    res.json({ success: true, results: [] });
    return;
  }

  const candidates = await PriceDAL.findByAnyToken(tokens, undefined, SEARCH_CANDIDATE_LIMIT);
  const byBarcode = new Map<string, ProductSearchResult & { order: number }>();
  candidates.forEach((c, i) => {
    const existing = byBarcode.get(c.barcode);
    if (existing) {
      existing.chainCount += 1;
      existing.minPrice = Math.min(existing.minPrice, c.price);
    } else {
      byBarcode.set(c.barcode, {
        barcode: c.barcode, itemName: c.itemName, manufacturerName: c.manufacturerName,
        chainCount: 1, minPrice: c.price, order: i, // order = דירוג הרלוונטיות מ-$text
      });
    }
  });

  const results = Array.from(byBarcode.values())
    .sort((a, b) => b.chainCount - a.chainCount || a.order - b.order)
    .slice(0, SEARCH_RESULT_LIMIT)
    .map(({ order: _order, ...rest }) => rest);
  res.json({ success: true, results });
});

// PUT /api/price-comparison/overrides  { productName, barcode? , excluded? }
// שומר את בחירת המשתמש למוצר: ברקוד נכון, או excluded=true ל"אין התאמה".
export const setOverride = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { productName, barcode, excluded } = (req.body ?? {}) as { productName?: unknown; barcode?: unknown; excluded?: unknown };

  if (typeof productName !== 'string' || productName.trim().length === 0 || productName.length > 200) {
    res.status(400).json({ success: false, message: 'שם מוצר לא תקין' });
    return;
  }
  const key = overrideKey(productName);
  if (!key) {
    res.status(400).json({ success: false, message: 'שם מוצר לא תקין' });
    return;
  }

  const isExcluded = excluded === true;
  if (!isExcluded) {
    if (typeof barcode !== 'string' || !BARCODE_PATTERN.test(barcode)) {
      res.status(400).json({ success: false, message: 'ברקוד לא תקין' });
      return;
    }
    // הברקוד חייב להיות מוצר אמיתי במאגר - לא שומרים ערכים שרירותיים
    const known = await PriceDAL.findByBarcode(barcode);
    if (known.length === 0) {
      res.status(404).json({ success: false, message: 'המוצר לא נמצא במאגר' });
      return;
    }
  }

  // מגבלת תיקונים למשתמש (עדכון של תיקון קיים לא נספר כחדש)
  if ((await PriceMatchOverrideDAL.countByUser(userId)) >= MAX_OVERRIDES_PER_USER) {
    const existing = await PriceMatchOverrideDAL.findOne({ userId, key });
    if (!existing) {
      res.status(400).json({ success: false, message: 'הגעת למגבלת התיקונים' });
      return;
    }
  }

  await PriceMatchOverrideDAL.upsert(userId, key, productName.trim(), {
    excluded: isExcluded,
    barcode: isExcluded ? undefined : (barcode as string),
  });
  invalidateUser(userId);
  res.json({ success: true });
});

// DELETE /api/price-comparison/overrides?productName=  - חזרה להתאמה האוטומטית
export const clearOverride = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const productName = typeof req.query.productName === 'string' ? req.query.productName : '';
  const key = overrideKey(productName);
  if (!key) {
    res.status(400).json({ success: false, message: 'שם מוצר לא תקין' });
    return;
  }
  await PriceMatchOverrideDAL.remove(userId, key);
  invalidateUser(userId);
  res.json({ success: true });
});
