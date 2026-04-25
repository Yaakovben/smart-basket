import type { Response } from 'express';
import { getComparisonForUser, invalidateAllUsers } from '../services/priceComparison.service';
import { syncAllChains, getRegisteredChains, getLastSyncResults, getSyncProgress, syncBranchesFromOsm } from '../services/priceSync.service';
import { parseUserLocation } from '../services/branches.service';
import { PriceDAL } from '../dal/price.dal';
import { BranchDAL } from '../dal/branch.dal';
import { asyncHandler } from '../../../utils';
import { logger } from '../../../config/logger';
import type { AuthRequest } from '../../../types';

// מצב סנכרון - מונע ריצות חופפות
let adminSyncInProgress = false;

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

// GET /api/price-comparison/status (admin only) - מצב המאגר: כמה רשתות, מוצרים, מתי עודכן
export const getStatus = asyncHandler(async (_req: AuthRequest, res: Response) => {
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
    return {
      chainId: r.chainId,
      chainName: r.chainName,
      count: found?.count ?? 0,
      lastSyncError: sync?.error ?? null,
      lastSyncAt: sync?.completedAt ?? null,
      lastSyncFetched: sync?.fetched ?? null,
      branchCount: branches?.count ?? 0,
      branchesWithCoords: branches?.withCoords ?? 0,
      storesError: sync?.storesError ?? null,
      storesFetched: sync?.storesFetched ?? null,
    };
  }).sort((a, b) => b.count - a.count);

  const latest = await PriceDAL.findOne({}, { sort: { updatedAt: -1 } });
  const lastUpdatedISO = latest?.updatedAt ? new Date(latest.updatedAt).toISOString() : null;
  const ageMs = latest?.updatedAt ? Date.now() - new Date(latest.updatedAt).getTime() : null;
  const ageHours = ageMs !== null ? ageMs / (60 * 60 * 1000) : null;

  res.json({
    success: true,
    data: {
      syncInProgress: adminSyncInProgress,
      syncProgress: getSyncProgress(),
      branchSync: getBranchSyncState(),
      lastUpdatedISO,
      ageHours,
      chains,
      totalPrices: chains.reduce((s, c) => s + c.count, 0),
    },
  });
});
