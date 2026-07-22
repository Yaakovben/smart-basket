import type { Response } from 'express';
import { invalidateAllUsers } from '../services/priceComparison.service';
import { geocodeAddress } from '../services/geocoder.service';
import { invalidateBranchCache } from '../services/branches.service';
import { Branch } from '../models/Branch.model';
import { BranchDAL } from '../dal/branch.dal';
import { asyncHandler } from '../../../utils';
import { logger } from '../../../config/logger';
import type { AuthRequest } from '../../../types';

// POST /api/price-comparison/branches/fill-addresses (admin)
// משלים כתובות חסרות לסניפים שיש להם lat/lng אך city/address ריק.
// משתמש ב-Nominatim (reverse geocoding, 1 req/s, מוגבל ל-50 לריצה).
// הריצה עצמה אורכת עד דקה ויותר ולכן רצה ברקע - ה-HTTP response חוזר מיד
// כדי שלא ניתקל ב-timeout של ה-proxy/Render.
let fillAddressesInProgress = false;
export const fillMissingAddresses = asyncHandler(async (_req: AuthRequest, res: Response) => {
  if (fillAddressesInProgress) {
    res.json({ success: true, message: 'כבר רץ ברקע - נסה שוב בעוד דקה', updated: 0 });
    return;
  }
  // שני כיוונים:
  // (א) reverse: יש lat/lng, חסר address/city → לוקחים כתובת מהקואורדינטות
  // (ב) forward: יש address/city, אין lat/lng → לוקחים lat/lng מהכתובת
  // הכי שכיח (ב) - Bina/Carrefour מחזירים כתובת בלי קואורדינטות.
  const needReverse = {
    lat: { $exists: true, $ne: null },
    lng: { $exists: true, $ne: null },
    $or: [
      { city: { $exists: false } },
      { city: { $in: [null, ''] } },
      { address: { $exists: false } },
      { address: { $in: [null, ''] } },
    ],
  };
  const needForward = {
    $or: [{ lat: { $exists: false } }, { lat: null }, { coordSource: 'unknown' as const }],
    $and: [{ $or: [{ address: { $exists: true, $ne: '' } }, { city: { $exists: true, $ne: '' } }] }],
  };
  const [reverseCount, forwardCount, reverseBranches, forwardBranches] = await Promise.all([
    Branch.countDocuments(needReverse),
    Branch.countDocuments(needForward),
    Branch.find(needReverse).limit(25).lean(),
    Branch.find(needForward).limit(25).lean(),
  ]);
  const totalMissing = reverseCount + forwardCount;
  const totalBatch = reverseBranches.length + forwardBranches.length;

  if (totalBatch === 0) {
    res.json({ success: true, message: 'אין סניפים שזקוקים להשלמה', updated: 0, totalMissing: 0, remaining: 0 });
    return;
  }

  fillAddressesInProgress = true;
  const remaining = Math.max(0, totalMissing - totalBatch);
  res.json({
    success: true,
    message: remaining > 0
      ? `מעדכן ${totalBatch} סניפים ברקע (${reverseBranches.length} כתובות + ${forwardBranches.length} קואורדינטות). נותרו ${remaining}.`
      : `מעדכן ${totalBatch} סניפים ברקע - האחרונים. סיום בעוד כדקה.`,
    checked: totalBatch,
    totalMissing,
    remaining,
  });

  void (async () => {
    try {
      const axios = (await import('axios')).default;
      let updated = 0;
      // קודם reverse (כתובת מקואורדינטות)
      for (let i = 0; i < reverseBranches.length; i++) {
        const b = reverseBranches[i];
        if (i > 0 || updated > 0) await new Promise(r => setTimeout(r, 1100));
        try {
          const r = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat: b.lat, lon: b.lng, format: 'json', 'accept-language': 'he' },
            headers: { 'User-Agent': 'smart-basket-app/1.0' },
            timeout: 10_000,
          });
          const addr = (r.data as { address?: Record<string, string> }).address || {};
          const city = addr.city || addr.town || addr.village || addr.suburb || '';
          const street = addr.road || addr.pedestrian || '';
          const num = addr.house_number || '';
          const fullAddress = [street, num].filter(Boolean).join(' ');
          if (city || fullAddress) {
            await Branch.updateOne(
              { _id: b._id },
              { $set: { city: city || b.city || '', address: fullAddress || b.address || '' } }
            );
            updated++;
          }
        } catch (e) {
          logger.warn(`[fill-addresses-reverse] ${b.storeId}: ${e instanceof Error ? e.message : 'unknown'}`);
        }
      }
      // אחר כך forward (קואורדינטות מכתובת) - דרך geocodeAddress
      for (let i = 0; i < forwardBranches.length; i++) {
        const b = forwardBranches[i];
        await new Promise(r => setTimeout(r, 1100));
        try {
          const coords = await geocodeAddress(b.address, b.city);
          if (coords) {
            await BranchDAL.updateCoords(b._id.toString(), coords.lat, coords.lng, 'geocoded');
            updated++;
          }
        } catch (e) {
          logger.warn(`[fill-addresses-forward] ${b.storeId}: ${e instanceof Error ? e.message : 'unknown'}`);
        }
      }
      invalidateBranchCache();
      invalidateAllUsers();
      logger.info(`[fill-addresses] done, updated=${updated}/${totalBatch}`);
    } catch (err) {
      logger.error('[fill-addresses] background failed:', err);
    } finally {
      fillAddressesInProgress = false;
    }
  })();
});
