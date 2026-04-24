/**
 * Branches Service - חישוב הסניף הקרוב ביותר לכל רשת על פי מיקום המשתמש.
 * הנתונים סטטיים (data/branches.data.ts); בעתיד אפשר להחליף בשאילתה ל-DB.
 */

import { BRANCHES, type BranchSeed } from '../data/branches.data';
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
// מחזיר קילומטרים. דיוק של ~0.5% עבור מרחקים קצרים - מספיק לטווח ערים.
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

// אינדקס מהיר: chainId → רשימת סניפים של אותה רשת.
// נבנה פעם אחת בטעינת המודול - ה-BRANCHES הוא static.
const branchesByChain = new Map<ChainId, BranchSeed[]>();
for (const b of BRANCHES) {
  const arr = branchesByChain.get(b.chainId);
  if (arr) arr.push(b);
  else branchesByChain.set(b.chainId, [b]);
}

// מחזיר את הסניף הקרוב ביותר לרשת נתונה. null אם אין סניפים ברשת זו.
export function findNearestBranch(chainId: ChainId, user: UserLocation): NearestBranch | null {
  const chainBranches = branchesByChain.get(chainId);
  if (!chainBranches || chainBranches.length === 0) return null;

  let best: BranchSeed | null = null;
  let bestDist = Infinity;
  for (const b of chainBranches) {
    const d = haversineKm(user, { lat: b.lat, lng: b.lng });
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  if (!best) return null;

  return {
    branchName: best.branchName,
    city: best.city,
    address: best.address,
    lat: best.lat,
    lng: best.lng,
    distanceKm: Math.round(bestDist * 10) / 10,
  };
}

// ולידציה של קואורדינטות שהגיעו מהמשתמש.
// מקבלים רק מספרים חוקיים בטווח סביר (נבדוק גלובלי, לא רק ישראל - שימור גמישות).
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
