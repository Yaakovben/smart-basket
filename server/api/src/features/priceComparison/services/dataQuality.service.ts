import { Branch } from '../models/Branch.model';
import { Price, type ChainId } from '../models/Price.model';
import { getLastSyncResults, getRegisteredChains } from './priceSync.service';

// גבולות גיאוגרפיים של ישראל - כל קואורדינטה מחוץ לטווח חשודה
const ISRAEL_BOUNDS = { latMin: 29.4, latMax: 33.4, lngMin: 34.2, lngMax: 35.9 };

// סף גיל של מחירים - מחיר שלא עודכן יותר מ-7 ימים נחשב מיושן
const STALE_PRICE_DAYS = 7;

// סף עליון לאיתור מחירים אבסורדיים
const PRICE_MAX = 5000;

export interface BranchIssue {
  id: string;
  chainId: string;
  storeId: string;
  storeName: string;
  city?: string;
  reasons: string[];
}

export interface PriceIssue {
  barcode: string;
  chainId: string;
  itemName: string;
  price: number;
  reason: string;
}

export interface ChainSyncStat {
  chainId: ChainId;
  chainName: string;
  totalPrices: number;
  totalBranches: number;
  oldestPriceAt: Date | null;
  newestPriceAt: Date | null;
  freshnessHours: number | null;
  lastSyncResult: {
    fetched: number;
    upserted: number;
    error?: string;
    storesError?: string;
    elapsedMs: number;
    completedAt: string;
  } | null;
}

export interface DataQualityReport {
  generatedAt: Date;
  branches: {
    total: number;
    issues: BranchIssue[];
    stats: {
      withoutCoords: number;
      outOfBounds: number;
      withoutCity: number;
    };
  };
  prices: {
    total: number;
    issues: PriceIssue[];
    stats: {
      zeroOrNegative: number;
      tooHigh: number;
      stale: number;
    };
  };
  sync: ChainSyncStat[];
}

// בדיקה האם לקואורדינטה יש ערך תקין בתוך גבולות ישראל
function coordsInIsrael(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  return (
    lat >= ISRAEL_BOUNDS.latMin && lat <= ISRAEL_BOUNDS.latMax &&
    lng >= ISRAEL_BOUNDS.lngMin && lng <= ISRAEL_BOUNDS.lngMax
  );
}

// סורק את כל הסניפים, מסמן חשודים. מוגבל לדוגמה של בעיות (לא מחזיר אלפי שורות).
async function auditBranches(): Promise<DataQualityReport['branches']> {
  const branches = await Branch.find({}, {
    chainId: 1, storeId: 1, storeName: 1, city: 1, lat: 1, lng: 1,
  }).lean();

  const issues: BranchIssue[] = [];
  let withoutCoords = 0;
  let outOfBounds = 0;
  let withoutCity = 0;

  for (const b of branches) {
    const reasons: string[] = [];
    if (typeof b.lat !== 'number' || typeof b.lng !== 'number') {
      reasons.push('חסרות קואורדינטות');
      withoutCoords++;
    } else if (!coordsInIsrael(b.lat, b.lng)) {
      reasons.push(`קואורדינטות מחוץ לישראל (${b.lat.toFixed(3)}, ${b.lng.toFixed(3)})`);
      outOfBounds++;
    }
    if (!b.city || !b.city.trim()) {
      withoutCity++;
      // לא נוסיף כסיבה - יותר מדי סניפים בלי עיר ייצרו רעש
    }
    if (reasons.length > 0) {
      issues.push({
        id: String(b._id),
        chainId: b.chainId,
        storeId: b.storeId,
        storeName: b.storeName,
        city: b.city,
        reasons,
      });
    }
  }

  // הגבלה ל-200 בעיות הראשונות כדי לא להציף את ה-frontend
  const limitedIssues = issues.slice(0, 200);

  return {
    total: branches.length,
    issues: limitedIssues,
    stats: { withoutCoords, outOfBounds, withoutCity },
  };
}

// סורק את כל המחירים, מסמן אנומליות. גם כאן מגביל את הפלט.
async function auditPrices(): Promise<DataQualityReport['prices']> {
  const total = await Price.estimatedDocumentCount();

  const staleBefore = new Date(Date.now() - STALE_PRICE_DAYS * 24 * 3600_000);

  // 3 שאילתות מקבילות - כל אחת מגבילה ל-50 דוגמאות
  const [zeroPrices, highPrices, stalePrices, zeroCount, highCount, staleCount] = await Promise.all([
    Price.find({ price: { $lte: 0 } }, { barcode: 1, chainId: 1, itemName: 1, price: 1 }).limit(50).lean(),
    Price.find({ price: { $gt: PRICE_MAX } }, { barcode: 1, chainId: 1, itemName: 1, price: 1 }).limit(50).lean(),
    Price.find({ updatedAt: { $lt: staleBefore } }, { barcode: 1, chainId: 1, itemName: 1, price: 1 }).limit(50).lean(),
    Price.countDocuments({ price: { $lte: 0 } }),
    Price.countDocuments({ price: { $gt: PRICE_MAX } }),
    Price.countDocuments({ updatedAt: { $lt: staleBefore } }),
  ]);

  const issues: PriceIssue[] = [
    ...zeroPrices.map(p => ({ barcode: p.barcode, chainId: p.chainId, itemName: p.itemName, price: p.price, reason: 'מחיר 0 או שלילי' })),
    ...highPrices.map(p => ({ barcode: p.barcode, chainId: p.chainId, itemName: p.itemName, price: p.price, reason: `מחיר חריג גבוה (>${PRICE_MAX}₪)` })),
    ...stalePrices.map(p => ({ barcode: p.barcode, chainId: p.chainId, itemName: p.itemName, price: p.price, reason: `מיושן (>${STALE_PRICE_DAYS} ימים)` })),
  ];

  return {
    total,
    issues,
    stats: { zeroOrNegative: zeroCount, tooHigh: highCount, stale: staleCount },
  };
}

// אגרגציה פר-רשת מ-Price + Branch + תוצאות sync בזיכרון
async function buildSyncStats(): Promise<ChainSyncStat[]> {
  const chains = getRegisteredChains();
  const lastResults = getLastSyncResults();
  const lastByChain = new Map(lastResults.map(r => [r.chainId, r]));

  const stats: ChainSyncStat[] = [];

  for (const { chainId, chainName } of chains) {
    const [count, branchCount, oldest, newest] = await Promise.all([
      Price.countDocuments({ chainId }),
      Branch.countDocuments({ chainId }),
      Price.findOne({ chainId }, { updatedAt: 1 }).sort({ updatedAt: 1 }).lean(),
      Price.findOne({ chainId }, { updatedAt: 1, chainName: 1 }).sort({ updatedAt: -1 }).lean(),
    ]);

    const newestAt = newest?.updatedAt ? new Date(newest.updatedAt) : null;
    const oldestAt = oldest?.updatedAt ? new Date(oldest.updatedAt) : null;
    const freshnessHours = newestAt ? (Date.now() - newestAt.getTime()) / 3_600_000 : null;
    const lastSync = lastByChain.get(chainId);

    stats.push({
      chainId: chainId as ChainId,
      chainName: newest?.chainName || chainName,
      totalPrices: count,
      totalBranches: branchCount,
      oldestPriceAt: oldestAt,
      newestPriceAt: newestAt,
      freshnessHours: freshnessHours !== null ? Math.round(freshnessHours * 10) / 10 : null,
      lastSyncResult: lastSync ? {
        fetched: lastSync.fetched,
        upserted: lastSync.upserted,
        error: lastSync.error,
        storesError: lastSync.storesError,
        elapsedMs: lastSync.elapsedMs,
        completedAt: lastSync.completedAt,
      } : null,
    });
  }

  return stats;
}

export async function buildDataQualityReport(): Promise<DataQualityReport> {
  const [branches, prices, sync] = await Promise.all([
    auditBranches(),
    auditPrices(),
    buildSyncStats(),
  ]);
  return { generatedAt: new Date(), branches, prices, sync };
}
