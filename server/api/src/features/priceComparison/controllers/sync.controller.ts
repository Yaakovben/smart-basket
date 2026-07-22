import type { Response } from 'express';
import { getComparisonForUser, invalidateAllUsers } from '../services/priceComparison.service';
import { syncAllChains, syncBranchesFromOsm } from '../services/priceSync.service';
import { geocodeAddress } from '../services/geocoder.service';
import { parseUserLocation, invalidateBranchCache } from '../services/branches.service';
import { Branch } from '../models/Branch.model';
import { BranchDAL } from '../dal/branch.dal';
import { asyncHandler } from '../../../utils';
import { logger } from '../../../config/logger';
import type { AuthRequest } from '../../../types';

// מצב סנכרון מחירים - מונע ריצות חופפות
let adminSyncInProgress = false;
export const isAdminSyncInProgress = (): boolean => adminSyncInProgress;

// Lazy auto-sync הוסר: גרם לסנכרון מלא ברקע בזמן בקשות לקוחות → עומס יתר על
// Render Free → לקוחות לא יכלו להיכנס. הקרון של 04:00/16:00 + סנכרון ידני
// מאדמין UI מחליפים אותו לחלוטין.

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
  // הוסר: lazy auto-sync שגרם לסנכרון מלא ברקע בזמן בקשות של לקוחות.
  // הקרון של 04:00 ו-16:00 + סנכרון startup מספיקים. אם נדרש סנכרון דחוף -
  // אדמין יכול ללחוץ 'סנכרון מחדש' באדמין UI.
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

    // השלמת קואורדינטות לסניפים חדשים שאין להם lat/lng - 100 בכל סנכרון.
    // רץ ברקע אחרי הסנכרון, סדרתי 1.1ש'/בקשה (Nominatim), לא חוסם.
    void (async () => {
      try {
        const missingFilter = {
          $or: [{ lat: { $exists: false } }, { lat: null }, { coordSource: 'unknown' as const }],
          $and: [{ $or: [{ address: { $exists: true, $ne: '' } }, { city: { $exists: true, $ne: '' } }] }],
        };
        const needGeo = await Branch.find(missingFilter).limit(100).lean();
        if (needGeo.length === 0) return;
        logger.info(`[admin-refresh] geocoding ${needGeo.length} branches in background`);
        let updated = 0;
        for (const b of needGeo) {
          try {
            const coords = await geocodeAddress(b.address, b.city);
            if (coords) {
              await BranchDAL.updateCoords(b._id.toString(), coords.lat, coords.lng, 'geocoded');
              updated++;
            }
          } catch { /* skip */ }
          await new Promise(r => setTimeout(r, 1100));
        }
        invalidateBranchCache();
        invalidateAllUsers();
        logger.info(`[admin-refresh] geocoded ${updated}/${needGeo.length} branches`);
      } catch (err) {
        logger.warn('[admin-refresh] geocoding failed:', err);
      }
    })();
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
