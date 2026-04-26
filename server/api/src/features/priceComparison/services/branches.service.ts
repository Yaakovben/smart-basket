/**
 * Branches Service - חישוב הסניף הקרוב ביותר לכל רשת על פי מיקום המשתמש.
 * הנתונים נשאבים מה-DB (collection 'branches'), שמתעדכן אוטומטית
 * בזמן syncAllChains() מקובצי Stores*.xml הרשמיים של הפורטל.
 *
 * יש cache בזיכרון (2 דקות) שנמנע מפגיעה במונגו בכל בקשת השוואת מחירים.
 */

import { BranchDAL } from '../dal/branch.dal';
import { Branch, type IBranchDoc } from '../models/Branch.model';
import type { ChainId } from '../models/Price.model';
import { KNOWN_BRANCHES } from '../data/known-branches.data';
import { logger } from '../../../config/logger';

export interface NearestBranch {
  branchName: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

// חישוב מרחק בין שתי נקודות ב-GPS בנוסחת Haversine.
export function haversineKm(a: UserLocation, b: UserLocation): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ===== Cache בזיכרון של כל הסניפים =====
// נטען פעם ב-2 דקות. האלטרנטיבה - שאילתה לכל בקשה - מיותרת כי
// נתונים משתנים רק בסנכרון אחת לכמה שעות.
const CACHE_TTL_MS = 2 * 60_000;
let cache: { branches: IBranchDoc[]; loadedAt: number } | null = null;

// טעינה אוטומטית של seed אם המאגר ריק - lazy בקשה ראשונה.
// ככה לא תלויים ב-startup hook או בכפתור אדמין: הסניפים מופיעים ברגע
// שמישהו פותח את עמוד המחירים עם מיקום.
let seedLoadAttempted = false;
async function ensureSeedLoaded(): Promise<void> {
  if (seedLoadAttempted) return;
  seedLoadAttempted = true;
  try {
    const count = await Branch.countDocuments();
    if (count > 0) {
      logger.info(`[branches-seed] DB has ${count} branches, no need to seed`);
      return;
    }
    logger.info('[branches-seed] DB empty, loading 65 known branches...');
    const chainNames: Record<string, string> = {
      shufersal: 'שופרסל', rami_levy: 'רמי לוי', yohananof: 'יוחננוף',
      osher_ad: 'אושר עד', tiv_taam: 'טיב טעם', keshet: 'קשת',
      stop_market: 'סטופ מרקט', politzer: 'פוליצר', doralon: 'דור אלון',
    };
    let loaded = 0;
    for (const b of KNOWN_BRANCHES) {
      try {
        await Branch.updateOne(
          { chainId: b.chainId, storeId: b.storeId },
          { $set: {
            chainId: b.chainId, chainName: chainNames[b.chainId] || b.chainId,
            storeId: b.storeId, storeName: b.storeName,
            address: b.address, city: b.city,
            lat: b.lat, lng: b.lng,
            coordSource: 'portal', lastSyncedAt: new Date(),
          } },
          { upsert: true }
        );
        loaded++;
      } catch (e) {
        if (loaded === 0) logger.error('[branches-seed] first error:', e);
      }
    }
    logger.info(`[branches-seed] loaded ${loaded}/65 branches`);
  } catch (err) {
    logger.error('[branches-seed] check failed:', err);
    seedLoadAttempted = false; // נסה שוב בבקשה הבאה
  }
}

async function getBranches(): Promise<IBranchDoc[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.branches;
  await ensureSeedLoaded();
  const all = await BranchDAL.findAll();
  cache = { branches: all as unknown as IBranchDoc[], loadedAt: Date.now() };
  return cache.branches;
}

export function invalidateBranchCache(): void {
  cache = null;
}

// מחזיר את הסניף הקרוב ביותר לרשת נתונה, רק מסניפים עם קואורדינטות תקפות.
// null אם אין סניפים או שכולם חסרי lat/lng.
export async function findNearestBranch(chainId: ChainId, user: UserLocation): Promise<NearestBranch | null> {
  const all = await getBranches();
  let best: IBranchDoc | null = null;
  let bestDist = Infinity;
  for (const b of all) {
    if (b.chainId !== chainId) continue;
    if (typeof b.lat !== 'number' || typeof b.lng !== 'number') continue;
    const d = haversineKm(user, { lat: b.lat, lng: b.lng });
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  if (!best) return null;
  return {
    branchName: best.storeName,
    city: best.city || '',
    address: best.address || '',
    lat: best.lat!,
    lng: best.lng!,
    distanceKm: Math.round(bestDist * 10) / 10,
  };
}

// ולידציה של קואורדינטות שהגיעו מהמשתמש.
export function parseUserLocation(
  latRaw: unknown,
  lngRaw: unknown
): UserLocation | null {
  const lat = typeof latRaw === 'string' ? Number(latRaw) : NaN;
  const lng = typeof lngRaw === 'string' ? Number(lngRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
