/**
 * Branches Service - חישוב הסניף הקרוב ביותר לכל רשת על פי מיקום המשתמש.
 * הנתונים נשאבים מה-DB (collection 'branches'), שמתעדכן אוטומטית
 * בזמן syncAllChains() מקובצי Stores*.xml הרשמיים של הפורטל.
 *
 * יש cache בזיכרון (2 דקות) שנמנע מפגיעה במונגו בכל בקשת השוואת מחירים.
 */

import { BranchDAL } from '../dal/branch.dal';
import type { IBranchDoc } from '../models/Branch.model';
import type { ChainId } from '../models/Price.model';

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

async function getBranches(): Promise<IBranchDoc[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.branches;
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
