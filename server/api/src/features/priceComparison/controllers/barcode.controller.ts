import type { Response } from 'express';
import { PriceDAL } from '../dal/price.dal';
import { asyncHandler } from '../../../utils';
import type { AuthRequest } from '../../../types';

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
