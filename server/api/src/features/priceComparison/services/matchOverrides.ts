import type { ChainId } from '../models/Price.model';
import { PriceDAL } from '../dal/price.dal';
import { PriceMatchOverrideDAL } from '../dal/priceMatchOverride.dal';
import { normalizeProductName } from '../chains';
import { finalizeMatch, type NameMatch } from './productMatcher';

// תיקוני התאמה של משתמש: מפתח = שם מנורמל. barcode חסר + excluded = "אין התאמה".
export type MatchOverrides = Map<string, { barcode?: string; excluded: boolean }>;

export interface OverrideContext {
  overrides: MatchOverrides;
  // מסמכי Price של הברקודים שנבחרו, לפי `chainId|barcode`
  docByKey: Map<string, Awaited<ReturnType<typeof PriceDAL.findByBarcodes>>[number]>;
}

export const overrideKey = (userProductName: string): string => normalizeProductName(userProductName);

// טוען את התיקונים של המשתמש ואת מחירי הברקודים שבחר (שאילתה אחת לכולם).
// מחזיר undefined כשאין תיקונים - הקורא מדלג על כל השלב.
export async function loadOverrideContext(userId: string): Promise<OverrideContext | undefined> {
  try {
    const rows = await PriceMatchOverrideDAL.listByUser(userId);
    if (rows.length === 0) return undefined;
    const overrides: MatchOverrides = new Map(
      rows.map(r => [r.key, { barcode: r.barcode, excluded: !!r.excluded }])
    );
    const barcodes = Array.from(new Set(rows.map(r => r.barcode).filter((b): b is string => !!b)));
    const docs = barcodes.length > 0 ? await PriceDAL.findByBarcodes(barcodes) : [];
    return { overrides, docByKey: new Map(docs.map(d => [`${d.chainId}|${d.barcode}`, d])) };
  } catch {
    // תיקונים הם שיפור, לא תנאי - כשל בטעינה לא מפיל את ההשוואה
    return undefined;
  }
}

// מחיל את תיקוני המשתמש על מטמון ההתאמות של רשת אחת (in-place).
// תיקון = המשתמש קבע את המוצר בדיוק: רשת שלא מחזיקה את הברקוד נשארת בלי
// התאמה במקום לנחש מוצר אחר.
export async function applyOverridesToCache(
  cache: Map<string, NameMatch>,
  ctx: OverrideContext | undefined,
  chainId: ChainId,
  storeId?: string
): Promise<void> {
  if (!ctx) return;
  await Promise.all(
    Array.from(cache.entries()).map(async ([name, current]) => {
      const ov = ctx.overrides.get(overrideKey(name));
      if (!ov) return;
      const doc = ov.barcode && !ov.excluded ? ctx.docByKey.get(`${chainId}|${ov.barcode}`) : undefined;
      if (!doc) {
        cache.set(name, {
          ...current,
          matched: false, itemName: '', itemNameNormalized: undefined, price: 0, barcode: '',
          matchConfidence: 0, matchedTokens: [], manufacturerName: undefined,
          priceVerifiedAtBranch: undefined, cheapestBranch: undefined,
          userOverride: ov.excluded ? 'excluded' : 'unavailable',
        });
        return;
      }
      try {
        const m = await finalizeMatch(current, doc, 1, current.matchedTokens, chainId, storeId);
        cache.set(name, { ...m, userOverride: 'chosen' });
      } catch {
        // נשארים עם ההתאמה האוטומטית
      }
    })
  );
}
