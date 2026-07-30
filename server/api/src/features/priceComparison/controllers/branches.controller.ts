import type { Response } from 'express';
import { invalidateAllUsers } from '../services/priceComparison.service';
import { invalidateBranchCache, getNearbyBranches, parseUserLocation } from '../services/branches.service';
import { KNOWN_BRANCHES } from '../data/known-branches.data';
import { Branch } from '../models/Branch.model';
import { BranchDAL } from '../dal/branch.dal';
import { asyncHandler } from '../../../utils';
import { logger } from '../../../config/logger';
import type { AuthRequest } from '../../../types';

const DEFAULT_NEARBY_RADIUS_KM = 15;
const MAX_NEARBY_RADIUS_KM = 100;

const CHAIN_NAMES: Record<string, string> = {
  shufersal: 'שופרסל', rami_levy: 'רמי לוי', yohananof: 'יוחננוף',
  osher_ad: 'אושר עד', tiv_taam: 'טיב טעם', keshet: 'קשת',
  stop_market: 'סטופ מרקט', politzer: 'פוליצר', doralon: 'דור אלון',
  victory: 'ויקטורי', netto: 'נטו',
};

// POST /api/price-comparison/load-seed (admin only)
// טעינה ידנית של 65 סניפים מוכרים. עובד תמיד - לולאה פשוטה,
// כל סניף נפרד, שום פעולה כפולה. מחזיר 200 בכל מצב.
export const loadKnownBranchesSeed = asyncHandler(async (_req: AuthRequest, res: Response) => {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const now = new Date();

  for (const b of KNOWN_BRANCHES) {
    try {
      await Branch.updateOne(
        { chainId: b.chainId, storeId: b.storeId },
        {
          $set: {
            chainId: b.chainId,
            chainName: CHAIN_NAMES[b.chainId] || b.chainId,
            storeId: b.storeId,
            storeName: b.storeName,
            address: b.address,
            city: b.city,
            lat: b.lat,
            lng: b.lng,
            coordSource: 'portal',
            lastSyncedAt: now,
          },
        },
        { upsert: true }
      );
      success++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : 'unknown';
      errors.push(`${b.storeId}: ${msg.substring(0, 80)}`);
      if (errors.length === 1) logger.error(`[load-seed] first error:`, e);
    }
  }

  invalidateBranchCache();
  invalidateAllUsers();
  logger.info(`[load-seed] done: ${success} success, ${failed} failed`);

  res.status(200).json({
    success: success > 0,
    message: failed === 0
      ? `✓ נטענו ${success} סניפים`
      : `${success} הצליחו, ${failed} נכשלו - דגימה: ${errors[0] || ''}`,
    upserted: success,
    failed,
    total: KNOWN_BRANCHES.length,
    sampleErrors: errors.slice(0, 3),
  });
});

// GET /api/price-comparison/branches/:chainId (admin only) - רשימת סניפים לרשת
export const getBranchesByChain = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chainId } = req.params;
  const branches = await BranchDAL.findByChain(chainId as never);
  res.json({
    success: true,
    chainId,
    count: branches.length,
    branches: branches.map(b => ({
      id: b._id.toString(),
      storeId: b.storeId,
      storeName: b.storeName,
      city: b.city || '',
      address: b.address || '',
      lat: b.lat,
      lng: b.lng,
      hasCoords: typeof b.lat === 'number' && typeof b.lng === 'number',
      coordSource: b.coordSource,
    })),
  });
});

// GET /api/price-comparison/branches-nearby (פתוח לכל משתמש מאומת) - סניפים למפה
// query: lat?, lng?, radiusKm? (ברירת מחדל 15 ק"מ, מקסימום 100).
// בלי lat/lng - מחזיר עד 500 סניפים (ראה getNearbyBranches). שדות קלילים בלבד.
export const getBranchesNearby = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = parseUserLocation(req.query.lat, req.query.lng);
  let radiusKm = DEFAULT_NEARBY_RADIUS_KM;
  const radiusRaw = req.query.radiusKm;
  if (typeof radiusRaw === 'string') {
    const parsed = Number(radiusRaw);
    if (Number.isFinite(parsed) && parsed > 0) radiusKm = Math.min(parsed, MAX_NEARBY_RADIUS_KM);
  }
  const branches = await getNearbyBranches(user, radiusKm);
  res.json({
    success: true,
    count: branches.length,
    branches,
  });
});

// POST /api/price-comparison/branches (admin) - יצירה/עדכון סניף ידני
export const createOrUpdateBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chainId, storeName, address, city, lat, lng, storeId } = req.body as {
    chainId?: string; storeName?: string; address?: string; city?: string;
    lat?: number; lng?: number; storeId?: string;
  };
  if (!chainId || !storeName || typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ success: false, message: 'חסרים שדות חובה: chainId, storeName, lat, lng' });
    return;
  }
  if (lat < 29 || lat > 34 || lng < 33 || lng > 36) {
    res.status(400).json({ success: false, message: 'קואורדינטות מחוץ לישראל' });
    return;
  }
  const finalStoreId = storeId || `manual-${Date.now()}`;
  try {
    await Branch.updateOne(
      { chainId, storeId: finalStoreId },
      { $set: {
        chainId, chainName: CHAIN_NAMES[chainId] || chainId,
        storeId: finalStoreId, storeName,
        address: address || '', city: city || '',
        lat, lng,
        coordSource: 'portal',
        lastSyncedAt: new Date(),
      } },
      { upsert: true }
    );
    invalidateBranchCache();
    invalidateAllUsers();
    res.json({ success: true, storeId: finalStoreId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    res.status(500).json({ success: false, message: msg });
  }
});

// POST /api/price-comparison/branches/bulk (admin) - הוספה המונית של סניפים מאומתים
// מקבל מערך של {chainId, storeName, city, address, lat, lng}.
// כל סניף עובר ולידציה. מסומנים כ-manual-bulk-* (מאומתים).
export const bulkAddBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const items = req.body?.branches as Array<{
    chainId?: string; storeName?: string; address?: string; city?: string;
    lat?: number; lng?: number;
  }> | undefined;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: 'חסר מערך branches' });
    return;
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const now = new Date();

  for (let i = 0; i < items.length; i++) {
    const b = items[i];
    if (!b.chainId || !b.storeName || typeof b.lat !== 'number' || typeof b.lng !== 'number') {
      failed++;
      errors.push(`#${i + 1}: חסר chainId/storeName/lat/lng`);
      continue;
    }
    if (b.lat < 29 || b.lat > 34 || b.lng < 33 || b.lng > 36) {
      failed++;
      errors.push(`#${i + 1}: קואורדינטות מחוץ לישראל`);
      continue;
    }
    try {
      const storeId = `manual-bulk-${Date.now()}-${i}`;
      await Branch.updateOne(
        { chainId: b.chainId, storeId },
        { $set: {
          chainId: b.chainId, chainName: CHAIN_NAMES[b.chainId] || b.chainId,
          storeId, storeName: b.storeName,
          address: b.address || '', city: b.city || '',
          lat: b.lat, lng: b.lng,
          coordSource: 'portal', lastSyncedAt: now,
        } },
        { upsert: true }
      );
      success++;
    } catch (e) {
      failed++;
      errors.push(`#${i + 1}: ${e instanceof Error ? e.message.substring(0, 50) : 'unknown'}`);
    }
  }

  invalidateBranchCache();
  invalidateAllUsers();
  res.json({
    success: success > 0,
    message: `${success} נוספו, ${failed} נכשלו`,
    success_count: success,
    failed_count: failed,
    errors: errors.slice(0, 5),
  });
});

// POST /api/price-comparison/branches/cleanup (admin) - מחיקת seed לא-מאומת
// מסיר סניפים שאינם מ-OSM (osm-*) או מהוספה ידנית (manual-*).
// אלה הם הסניפים מה-seed הידני המקורי שאינם מאומתים.
export const cleanupUnverifiedBranches = asyncHandler(async (_req: AuthRequest, res: Response) => {
  try {
    // מוחק את כל הסניפים מ-seed הידני (manual-*) כי הם היו ניחושים לא מאומתים.
    // משאיר osm-* (מ-OpenStreetMap) ו-storeId מהפורטלים (Bina/Cerberus) שהם נתונים אמיתיים.
    const result = await Branch.deleteMany({
      storeId: { $regex: '^manual-' },
    });
    invalidateBranchCache();
    invalidateAllUsers();
    logger.info(`[branches-cleanup] removed ${result.deletedCount} manual seed branches`);
    res.json({
      success: true,
      message: `נמחקו ${result.deletedCount} סניפים ידניים לא-מאומתים`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    res.status(500).json({ success: false, message: msg });
  }
});

// DELETE /api/price-comparison/branches/:id (admin) - מחיקת סניף
export const deleteBranch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await Branch.deleteOne({ _id: id });
    invalidateBranchCache();
    invalidateAllUsers();
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: 'סניף לא נמצא' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    res.status(500).json({ success: false, message: msg });
  }
});
