import type { Response } from 'express';
import { getComparisonForUser, invalidateAllUsers } from '../services/priceComparison.service';
import { syncAllChains, getRegisteredChains, getLastSyncResults, getSyncProgress, syncBranchesFromOsm } from '../services/priceSync.service';
import { parseUserLocation, invalidateBranchCache } from '../services/branches.service';
import { KNOWN_BRANCHES } from '../data/known-branches.data';
import { Branch } from '../models/Branch.model';
import { PriceDAL } from '../dal/price.dal';
import { BranchDAL } from '../dal/branch.dal';
import { asyncHandler } from '../../../utils';
import { logger } from '../../../config/logger';
import type { AuthRequest } from '../../../types';

// מצב סנכרון - מונע ריצות חופפות
let adminSyncInProgress = false;

// Lazy auto-sync: כל בקשה מ-user בודק טריות ומפעיל סנכרון ברקע אם ישן.
// פותר את הבעיה ש-Render free tier ישן והקרון לא רץ - כל בקשת user מעירה אותו.
const LAZY_SYNC_THRESHOLD_HOURS = 12;
let lazyAutoSyncInProgress = false;
async function maybeTriggerLazySync(): Promise<void> {
  if (lazyAutoSyncInProgress || adminSyncInProgress) return;
  try {
    const latest = await PriceDAL.findOne({}, { sort: { updatedAt: -1 } });
    if (!latest) return; // אין נתונים - הסנכרון startup יטפל
    const ageH = (Date.now() - new Date(latest.updatedAt).getTime()) / 3_600_000;
    if (ageH < LAZY_SYNC_THRESHOLD_HOURS) return;
    lazyAutoSyncInProgress = true;
    logger.info(`[lazy-sync] Data is ${ageH.toFixed(1)}h old, triggering background sync`);
    // ברקע - לא חוסם את הבקשה הנוכחית של המשתמש
    void (async () => {
      const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      try {
        const results = await syncAllChains();
        const summary = results.map(r => `${r.chainId}:${r.upserted}`).join(', ');
        logger.info(`[lazy-sync] Completed: ${summary}`);
        invalidateAllUsers();
      } catch (err) {
        logger.error('[lazy-sync] Failed:', err);
      } finally {
        if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
        lazyAutoSyncInProgress = false;
      }
    })();
  } catch {
    lazyAutoSyncInProgress = false;
  }
}

// GET /api/price-comparison[?listId=X][&lat=&lng=]
// listId אופציונלי - מסנן את ההשוואה לרשימה יחידה. בלעדיו: איחוד כל הרשימות.
// lat/lng אופציונליים - אם מועברים, כל רשת תכלול את הסניף הקרוב ביותר עם מרחק.
export const getComparison = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const rawListId = req.query.listId;
  const listId = typeof rawListId === 'string' && /^[0-9a-fA-F]{24}$/.test(rawListId)
    ? rawListId
    : undefined;
  const userLocation = parseUserLocation(req.query.lat, req.query.lng) ?? undefined;
  const data = await getComparisonForUser(userId, listId, userLocation);
  res.json({ success: true, data });
  // טריגר רענון אוטומטי ברקע אם הנתונים ישנים יותר מ-12 שעות
  void maybeTriggerLazySync();
});

// POST /api/price-comparison/refresh (admin only)
// מריץ סנכרון מיידי של כל הרשתות - שימוש בעת טעינה ראשונית או כשצריך ריענון דחוף
export const refreshPrices = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (adminSyncInProgress) {
    res.status(409).json({
      success: false,
      message: 'סנכרון כבר פעיל, נסה שוב בעוד דקה',
    });
    return;
  }

  adminSyncInProgress = true;
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  // החזר מיידית תשובה — מריצים ברקע כדי לא לחסום את הבקשה
  // (הסנכרון יכול לקחת 2-5 דקות)
  res.json({
    success: true,
    message: 'סנכרון החל ברקע - יסתיים בעוד מספר דקות',
  });

  try {
    logger.info(`[admin-refresh] Triggered by user ${req.user!.id}`);
    const results = await syncAllChains();
    const summary = results.map(r => `${r.chainId}:${r.upserted}${r.error ? '(err)' : ''}`).join(', ');
    logger.info(`[admin-refresh] Completed: ${summary}`);
    // ניקוי מטמון של כל המשתמשים - אחרי סנכרון הנתונים הכל השתנה,
    // כולם צריכים לראות את המחירים והסניפים המעודכנים מיד.
    invalidateAllUsers();
  } catch (err) {
    logger.error('[admin-refresh] Unhandled error:', err);
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
    adminSyncInProgress = false;
  }
});

// POST /api/price-comparison/refresh-branches (admin only)
// סנכרון סניפים מ-OpenStreetMap - אסינכרוני כי Render מוגבל ל-30 שניות
// בקשת HTTP. מחזיר מיד והסנכרון רץ ברקע. סטטוס נחשף ב-/status.
interface BranchSyncState {
  active: boolean;
  startedAt: string | null;
  completedAt: string | null;
  totalFetched: number;
  totalUpserted: number;
  error: string | null;
}
let branchSyncState: BranchSyncState = {
  active: false, startedAt: null, completedAt: null,
  totalFetched: 0, totalUpserted: 0, error: null,
};
export const getBranchSyncState = (): BranchSyncState => ({ ...branchSyncState });

export const refreshBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (branchSyncState.active) {
    res.status(409).json({ success: false, message: 'סנכרון סניפים כבר רץ, נסה שוב בעוד דקה' });
    return;
  }
  branchSyncState = {
    active: true,
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalFetched: 0, totalUpserted: 0, error: null,
  };
  logger.info(`[admin-refresh-branches] Triggered by user ${req.user!.id}`);

  // החזרה מיידית - לא חוסמים את הבקשה (Render עוצר אחרי 30s)
  res.json({ success: true, message: 'סנכרון החל ברקע, יופיע כשייגמר' });

  // הסנכרון עצמו ברקע
  void (async () => {
    try {
      const results = await syncBranchesFromOsm();
      const totalFetched = results.reduce((s, r) => s + r.fetched, 0);
      const totalUpserted = results.reduce((s, r) => s + r.upserted, 0);
      invalidateAllUsers();
      logger.info(`[admin-refresh-branches] Completed: ${totalFetched} fetched, ${totalUpserted} upserted`);
      branchSyncState = {
        active: false,
        startedAt: branchSyncState.startedAt,
        completedAt: new Date().toISOString(),
        totalFetched, totalUpserted, error: null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      logger.error('[admin-refresh-branches] Background error:', err);
      branchSyncState = {
        active: false,
        startedAt: branchSyncState.startedAt,
        completedAt: new Date().toISOString(),
        totalFetched: 0, totalUpserted: 0, error: msg,
      };
    }
  })();
});

// POST /api/price-comparison/load-seed (admin only)
// טעינה ידנית של 65 סניפים מוכרים. עובד תמיד - לולאה פשוטה,
// כל סניף נפרד, שום פעולה כפולה. מחזיר 200 בכל מצב.
const CHAIN_NAMES: Record<string, string> = {
  shufersal: 'שופרסל', rami_levy: 'רמי לוי', yohananof: 'יוחננוף',
  osher_ad: 'אושר עד', tiv_taam: 'טיב טעם', keshet: 'קשת',
  stop_market: 'סטופ מרקט', politzer: 'פוליצר', doralon: 'דור אלון',
  victory: 'ויקטורי',
};

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
  // צריך גם סניפים שבכלל אין להם שדה city/address (undefined) - לא רק null/''.
  // לכן בודקים $exists: false וגם null וגם מחרוזת ריקה.
  const missingFilter = {
    lat: { $exists: true, $ne: null },
    lng: { $exists: true, $ne: null },
    $or: [
      { city: { $exists: false } },
      { city: { $in: [null, ''] } },
      { address: { $exists: false } },
      { address: { $in: [null, ''] } },
    ],
  };
  const totalMissing = await Branch.countDocuments(missingFilter);
  const branches = await Branch.find(missingFilter).limit(50).lean();

  if (branches.length === 0) {
    res.json({ success: true, message: 'אין סניפים שזקוקים להשלמת כתובת', updated: 0, totalMissing: 0, remaining: 0 });
    return;
  }

  fillAddressesInProgress = true;
  const remaining = Math.max(0, totalMissing - branches.length);
  res.json({
    success: true,
    message: remaining > 0
      ? `מעדכן ${branches.length} סניפים ברקע. נותרו ${remaining} - לחץ שוב לאחר סיום.`
      : `מעדכן ${branches.length} סניפים ברקע - האחרונים. סיום בעוד כדקה.`,
    checked: branches.length,
    totalMissing,
    remaining,
  });

  void (async () => {
    try {
      const axios = (await import('axios')).default;
      let updated = 0;
      for (let i = 0; i < branches.length; i++) {
        const b = branches[i];
        if (i > 0) await new Promise(r => setTimeout(r, 1100));
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
          logger.warn(`[fill-addresses] ${b.storeId}: ${e instanceof Error ? e.message : 'unknown'}`);
        }
      }
      invalidateBranchCache();
      invalidateAllUsers();
      logger.info(`[fill-addresses] background done, updated=${updated}/${branches.length}`);
    } catch (err) {
      logger.error('[fill-addresses] background failed:', err);
    } finally {
      fillAddressesInProgress = false;
    }
  })();
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

// GET /api/price-comparison/test-osm (admin only) - בדיקה דיאגנוסטית מהירה.
// בודק כל Overpass endpoint בנפרד עם שאילתה זעירה (5 שניות לכל אחד),
// ומחזיר תוך 25 שניות מקסימום - מתחת ל-30 של Render. מציג בדיוק איזה
// endpoint מגיב ואיזה לא.
export const testOsm = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const axios = (await import('axios')).default;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
  ];
  // שאילתה זעירה - חיפוש 1 supermarket בתוך תיבה קטנטנה. אמורה לחזור ב-1-2 שניות.
  const tinyQuery = '[out:json][timeout:5];node(31.7,34.7,32.1,34.9)["shop"="supermarket"];out 1;';

  const results = await Promise.all(endpoints.map(async (endpoint) => {
    const t0 = Date.now();
    try {
      const r = await axios.post(endpoint, `data=${encodeURIComponent(tinyQuery)}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'smart-basket-app/1.0',
        },
        timeout: 5_000,
      });
      const elements = (r.data as { elements?: unknown[] })?.elements || [];
      return { endpoint, ok: true, elapsedMs: Date.now() - t0, status: r.status, elements: elements.length };
    } catch (err) {
      const e = err as { message?: string; code?: string; response?: { status?: number } };
      return {
        endpoint, ok: false, elapsedMs: Date.now() - t0,
        error: e.message || 'unknown',
        code: e.code,
        httpStatus: e.response?.status,
      };
    }
  }));

  const working = results.filter(r => r.ok);
  res.json({
    success: working.length > 0,
    workingEndpoints: working.length,
    totalEndpoints: endpoints.length,
    summary: working.length === 0
      ? 'אף endpoint של Overpass לא מגיב מהשרת'
      : `${working.length}/${endpoints.length} endpoints עובדים`,
    results,
  });
});

// Cache קצר-טווח לתוצאת getStatus - האגרגציות כבדות, 20s מספיקות לטריות
let statusCache: { data: Record<string, unknown>; expiresAt: number } | null = null;
const STATUS_CACHE_TTL_MS = 20_000;

// GET /api/price-comparison/status (admin only) - מצב המאגר
export const getStatus = asyncHandler(async (_req: AuthRequest, res: Response) => {
  if (statusCache && statusCache.expiresAt > Date.now()) {
    res.json({ success: true, data: statusCache.data, fromCache: true });
    return;
  }
  const active = await PriceDAL.getActiveChainsWithCounts();
  const activeMap = new Map(active.map(c => [c.chainId, c]));
  const branchCounts = await BranchDAL.countsByChain();
  const branchMap = new Map(branchCounts.map(b => [b.chainId, b]));
  const lastSyncMap = new Map(getLastSyncResults().map(r => [r.chainId, r]));

  // ממזגים את כל הרשתות הרשומות (מה-adapters) עם כמויות מה-DB + תוצאות סנכרון אחרונות.
  // רשתות שאין להן נתונים עדיין יופיעו עם count=0 — מונע "היעלמות" של רשת שהסנכרון שלה נכשל.
  const registered = getRegisteredChains();
  const chains = registered.map(r => {
    const found = activeMap.get(r.chainId as import('../models/Price.model').ChainId);
    const sync = lastSyncMap.get(r.chainId);
    const branches = branchMap.get(r.chainId as import('../models/Price.model').ChainId);
    const priceCount = found?.count ?? 0;
    const branchCount = branches?.count ?? 0;
    const branchesWithCoords = branches?.withCoords ?? 0;
    // health: סיווג מהיר לאדמין כדי לראות מה דורש טיפול.
    // ok = יש מחירים + סניפים עם קואורדינטות
    // no_prices = יש סניפים אבל לא הצלחנו לסנכרן מחירים (auth/file path issue)
    // no_branches = יש מחירים אבל אין סניפים (StoresFull נכשל ו-OSM לא מצא)
    // no_geo = יש סניפים אבל בלי קואורדינטות (לא יוכלו להופיע במפה)
    // no_data = שום דבר - הסנכרון הראשון עוד לא רץ או username שגוי
    let health: 'ok' | 'no_prices' | 'no_branches' | 'no_geo' | 'no_data';
    if (priceCount === 0 && branchCount === 0) health = 'no_data';
    else if (priceCount === 0) health = 'no_prices';
    else if (branchCount === 0) health = 'no_branches';
    else if (branchesWithCoords === 0) health = 'no_geo';
    else health = 'ok';
    return {
      chainId: r.chainId,
      chainName: r.chainName,
      count: priceCount,
      lastSyncError: sync?.error ?? null,
      lastSyncAt: sync?.completedAt ?? null,
      lastSyncFetched: sync?.fetched ?? null,
      branchCount,
      branchesWithCoords,
      storesError: sync?.storesError ?? null,
      storesFetched: sync?.storesFetched ?? null,
      health,
    };
  }).sort((a, b) => b.count - a.count);

  // סיכום בריאות מערכתי - אדמין יכול במבט אחד לראות כמה רשתות בעייתיות.
  const healthSummary = {
    ok: chains.filter(c => c.health === 'ok').length,
    no_prices: chains.filter(c => c.health === 'no_prices').length,
    no_branches: chains.filter(c => c.health === 'no_branches').length,
    no_geo: chains.filter(c => c.health === 'no_geo').length,
    no_data: chains.filter(c => c.health === 'no_data').length,
    needsAttention: chains.filter(c => c.health !== 'ok').map(c => ({ chainId: c.chainId, chainName: c.chainName, health: c.health })),
  };

  const latest = await PriceDAL.findOne({}, { sort: { updatedAt: -1 } });
  const lastUpdatedISO = latest?.updatedAt ? new Date(latest.updatedAt).toISOString() : null;
  const ageMs = latest?.updatedAt ? Date.now() - new Date(latest.updatedAt).getTime() : null;
  const ageHours = ageMs !== null ? ageMs / (60 * 60 * 1000) : null;

  const responseData = {
    syncInProgress: adminSyncInProgress,
    syncProgress: getSyncProgress(),
    branchSync: getBranchSyncState(),
    lastUpdatedISO,
    ageHours,
    chains,
    totalPrices: chains.reduce((s, c) => s + c.count, 0),
    healthSummary,
  };
  statusCache = { data: responseData, expiresAt: Date.now() + STATUS_CACHE_TTL_MS };
  res.json({
    success: true,
    data: responseData,
  });
});

