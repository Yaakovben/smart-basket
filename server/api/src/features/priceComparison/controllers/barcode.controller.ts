import type { Response } from 'express';
import { PriceDAL } from '../dal/price.dal';
import { asyncHandler } from '../../../utils';
import type { AuthRequest } from '../../../types';
import { UserDAL } from '../../../dal';
import { PlanLimitError } from '../../../errors';
import { PLAN_LIMITS, isPro } from '../../../constants';
import { planUsage } from '../../../services/plan-usage.service';
import { parseUserLocation } from '../services/branches.service';
import { scanBarcodePrices, warmScanCaches } from '../services/barcodeScan.service';
import { logger } from '../../../config/logger';

const BARCODE_PATTERN = /^\d{6,14}$/;

// GET /api/price-comparison/barcode/:barcode - שם מוצר לפי ברקוד שנסרק
// (הוספת מוצר מהירה ברשימה). מחפש בכל הרשתות שיש להן נתוני מחיר עם
// הברקוד הזה, ומחזיר את השם הנפוץ ביותר ביניהן (כמה רשתות לפעמים
// מנסחות את אותו מוצר מעט אחרת).
export const lookupBarcode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { barcode } = req.params;
  if (!BARCODE_PATTERN.test(barcode)) {
    res.json({ success: true, data: null });
    return;
  }

  const matches = await PriceDAL.findByBarcode(barcode);
  if (matches.length === 0) {
    res.json({ success: true, data: null });
    return;
  }

  const nameCounts = new Map<string, number>();
  for (const m of matches) {
    nameCounts.set(m.itemName, (nameCounts.get(m.itemName) || 0) + 1);
  }
  const [bestName] = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  res.json({ success: true, data: { name: bestName } });
});

// GET /api/price-comparison/scan/:barcode[?lat=&lng=&acc=] - "איפה הכי זול" למוצר
// שנסרק: הסניף שהמשתמש נמצא בו, הסניפים הזולים קרוב אליו, הזול בכל הארץ, ומחיר לכל רשת.
// למשתמש חינמי נספר כהשוואת מחיר אחת (אותה מכסה יומית כמו השוואת רשימה),
// ורק כשהמוצר נמצא, כדי לא לשרוף מכסה על ברקוד שאין עליו נתונים.
// GET /api/price-comparison/scan-warmup - נקרא כשנכנסים למסך הסריקה. עונה מיד,
// והטעינה ממשיכה ברקע, כך שהסריקה עצמה לא מחכה לה.
export const warmScan = (_req: AuthRequest, res: Response): void => {
  warmScanCaches().catch(err => logger.warn(`[scan] warmup failed: ${err instanceof Error ? err.message : 'unknown'}`));
  res.status(204).end();
};

export const scanBarcode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { barcode } = req.params;
  if (!BARCODE_PATTERN.test(barcode)) {
    res.json({ success: true, data: null });
    return;
  }

  const userId = req.user!.id;
  const user = await UserDAL.findById(userId).catch(() => null);
  const userIsFree = !!user && !isPro(user);
  // אותו מוצר שכבר נסרק היום לא נספר שוב ולא נחסם
  const alreadyCounted = userIsFree && planUsage.wasScannedToday(userId, barcode);
  if (userIsFree && !alreadyCounted) {
    const limit = PLAN_LIMITS.free.maxPriceComparisonsPerDay;
    if (planUsage.getPriceCount(userId) >= limit) throw PlanLimitError.priceComparison(limit);
  }

  const location = parseUserLocation(req.query.lat, req.query.lng);
  // דיוק המיקום במטרים, לזיהוי "אתה נמצא בסניף". ערך לא סביר = לא ידוע
  const accRaw = typeof req.query.acc === 'string' ? Number(req.query.acc) : NaN;
  const accuracyM = Number.isFinite(accRaw) && accRaw > 0 && accRaw < 100_000 ? accRaw : undefined;
  const result = await scanBarcodePrices(barcode, location, accuracyM);
  if (result && userIsFree && !alreadyCounted) {
    planUsage.incrementPrice(userId);
    planUsage.markScanned(userId, barcode);
  }
  res.json({ success: true, data: result });
});
