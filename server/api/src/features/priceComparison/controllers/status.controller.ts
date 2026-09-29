import type { Response } from 'express';
import { getRegisteredChains, getLastSyncResults, getSyncProgress } from '../services/priceSync.service';
import { PriceDAL } from '../dal/price.dal';
import { BranchDAL } from '../dal/branch.dal';
import { asyncHandler } from '../../../utils';
import type { AuthRequest } from '../../../types';
import type { ChainId } from '../models/Price.model';
import { getBranchSyncState } from './sync.controller';
import { PriceSyncLogDAL } from '../dal/priceSyncLog.dal';
import { Promotion } from '../models/Promotion.model';
import { isStale } from '../services/scanPricing';

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
  // הלוג השמור: משותף לכל השרתים ושורד הפעלה מחדש (הזיכרון של השרת הזה לא רואה
  // סנכרון שרץ בשרת אחר או לפני שהשרת עלה)
  const logs = await PriceSyncLogDAL.latestPerChain().catch(() => []);
  const logOf = (chainId: string, type: string) => logs.find(l => l.chainId === chainId && l.type === type);
  const promoCounts = new Map((await Promotion.aggregate<{ _id: string; n: number }>([
    { $group: { _id: '$chainId', n: { $sum: 1 } } },
  ]).catch(() => [])).map(p => [p._id, p.n]));

  // ממזגים את כל הרשתות הרשומות (מה-adapters) עם כמויות מה-DB + תוצאות סנכרון אחרונות.
  // רשתות שאין להן נתונים עדיין יופיעו עם count=0 — מונע "היעלמות" של רשת שהסנכרון שלה נכשל.
  const registered = getRegisteredChains();
  const chains = registered.map(r => {
    const found = activeMap.get(r.chainId as ChainId);
    const sync = lastSyncMap.get(r.chainId);
    const branches = branchMap.get(r.chainId as ChainId);
    const priceCount = found?.count ?? 0;
    const branchCount = branches?.count ?? 0;
    const branchesWithCoords = branches?.withCoords ?? 0;
    const priceLog = logOf(r.chainId, 'price-full');
    const storesLog = logOf(r.chainId, 'stores');
    const lastUpdated = found?.lastUpdated ? new Date(found.lastUpdated) : null;
    const stale = !!lastUpdated && isStale(lastUpdated);
    // health: סיווג מהיר לאדמין כדי לראות מה דורש טיפול.
    // ok = יש מחירים + סניפים עם קואורדינטות
    // no_prices = יש סניפים אבל לא הצלחנו לסנכרן מחירים (auth/file path issue)
    // no_branches = יש מחירים אבל אין סניפים (StoresFull נכשל ו-OSM לא מצא)
    // no_geo = יש סניפים אבל פחות מ-70% עם קואורדינטות (השאר לא יופיעו ב"קרוב אליך")
    // stale = המחירים לא עודכנו מעל 48 שעות
    // no_data = שום דבר - הסנכרון הראשון עוד לא רץ או username שגוי
    let health: 'ok' | 'no_prices' | 'no_branches' | 'no_geo' | 'stale' | 'no_data';
    if (priceCount === 0 && branchCount === 0) health = 'no_data';
    else if (priceCount === 0) health = 'no_prices';
    else if (branchCount === 0) health = 'no_branches';
    else if (stale) health = 'stale';
    else if (branchesWithCoords < branchCount * 0.7) health = 'no_geo';
    else health = 'ok';
    return {
      chainId: r.chainId,
      chainName: r.chainName,
      count: priceCount,
      lastSyncError: sync?.error ?? (priceLog?.status === 'failed' ? priceLog.error ?? 'failed' : null),
      // מתי המחירים של הרשת עודכנו בפועל במאגר
      lastSyncAt: lastUpdated?.toISOString() ?? sync?.completedAt ?? null,
      lastSyncAttemptAt: (priceLog?.finishedAt ?? priceLog?.startedAt)?.toISOString?.() ?? sync?.completedAt ?? null,
      lastSyncFetched: sync?.fetched ?? priceLog?.recordsDownloaded ?? null,
      branchCount,
      branchesWithCoords,
      storesError: sync?.storesError ?? (storesLog?.status === 'failed' ? storesLog.error ?? 'failed' : null),
      storesFetched: sync?.storesFetched ?? storesLog?.recordsDownloaded ?? null,
      promotions: promoCounts.get(r.chainId) ?? 0,
      health,
    };
  }).sort((a, b) => b.count - a.count);

  // סיכום בריאות מערכתי - אדמין יכול במבט אחד לראות כמה רשתות בעייתיות.
  const healthSummary = {
    ok: chains.filter(c => c.health === 'ok').length,
    no_prices: chains.filter(c => c.health === 'no_prices').length,
    no_branches: chains.filter(c => c.health === 'no_branches').length,
    no_geo: chains.filter(c => c.health === 'no_geo').length,
    stale: chains.filter(c => c.health === 'stale').length,
    no_data: chains.filter(c => c.health === 'no_data').length,
    needsAttention: chains.filter(c => c.health !== 'ok').map(c => ({ chainId: c.chainId, chainName: c.chainName, health: c.health })),
  };

  // העדכון האחרון מבין הרשתות, מהאגרגציה שכבר נעשתה (בלי מיון של כל האוסף)
  const latestMs = Math.max(0, ...active.map(c => (c.lastUpdated ? new Date(c.lastUpdated).getTime() : 0)));
  const lastUpdatedISO = latestMs > 0 ? new Date(latestMs).toISOString() : null;
  const ageMs = latestMs > 0 ? Date.now() - latestMs : null;
  const ageHours = ageMs !== null ? ageMs / (60 * 60 * 1000) : null;

  // פיזור סניפים לפי מקור הקואורדינטות - לתצוגת אדמין מפורטת
  const branchSourceBreakdown = await BranchDAL.countsBySource();

  const responseData = {
    // getSyncProgress().active הוא המנעול המשותף האמיתי (syncAllChains
    // עצמו נועל) - משקף גם ריצת cron, לא רק סנכרון שהתחיל מהאדמין.
    syncInProgress: getSyncProgress().active,
    syncProgress: getSyncProgress(),
    branchSync: getBranchSyncState(),
    lastUpdatedISO,
    ageHours,
    chains,
    totalPrices: chains.reduce((s, c) => s + c.count, 0),
    healthSummary,
    branchSourceBreakdown,
  };
  statusCache = { data: responseData, expiresAt: Date.now() + STATUS_CACHE_TTL_MS };
  res.json({
    success: true,
    data: responseData,
  });
});
