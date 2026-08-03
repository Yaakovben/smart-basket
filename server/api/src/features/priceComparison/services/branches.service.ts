/**
 * Branches Service - חישוב הסניף הקרוב ביותר לכל רשת על פי מיקום המשתמש.
 * הנתונים נשאבים מה-DB (collection 'branches'), שמתעדכן אוטומטית
 * בזמן syncAllChains() מקובצי Stores*.xml הרשמיים של הפורטל.
 *
 * יש cache בזיכרון (2 דקות) שנמנע מפגיעה במונגו בכל בקשת השוואת מחירים.
 */

import { Branch, type IBranchDoc } from '../models/Branch.model';
import type { ChainId } from '../models/Price.model';
import { KNOWN_BRANCHES } from '../data/known-branches.data';
import { logger } from '../../../config/logger';

export interface NearestBranch {
  branchName: string;
  city: string;
  address: string;
  // lat/lng/distanceKm אופציונליים - סניפים עם כתובת בלבד (ללא קואורדינטות)
  // עדיין מוצגים, ועדיין ניתנים לניווט באמצעות חיפוש כתובת.
  lat?: number;
  lng?: number;
  distanceKm?: number;
  // האם המרחק שהוצג הוא הערכה (קואורדינטות לפי מרכז העיר) ולא מדויק.
  // הלקוח חייב להציג סימן (~/בערך) כדי שהמשתמש ידע. true רק כש-coordSource='unknown'.
  isApproximate?: boolean;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

// חישוב מרחק בין שתי נקודות ב-GPS בנוסחת Haversine.
function haversineKm(a: UserLocation, b: UserLocation): number {
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
    const chainNames: Record<string, string> = {
      shufersal: 'שופרסל', rami_levy: 'רמי לוי', yohananof: 'יוחננוף',
      osher_ad: 'אושר עד', tiv_taam: 'טיב טעם', keshet: 'קשת',
      stop_market: 'סטופ מרקט', politzer: 'פוליצר', doralon: 'דור אלון',
      victory: 'ויקטורי', maayan_2000: 'מעיין 2000',
    };
    // טעינת KNOWN_BRANCHES בכל startup (idempotent דרך upsert על
    // chainId+storeId). חשוב: גם אם יש סניפים, רשתות חדשות שנוספו
    // ל-KNOWN_BRANCHES חייבות להיכנס - רק upsert בסניפים שכבר קיימים
    // לא יחליף נתונים שנערכו ידנית באדמין.
    const count = await Branch.countDocuments();
    logger.info(`[branches-seed] DB has ${count} branches, upserting ${KNOWN_BRANCHES.length} seeds...`);
    const now = new Date();
    const ops = KNOWN_BRANCHES.map(b => ({
      updateOne: {
        filter: { chainId: b.chainId, storeId: b.storeId },
        update: { $set: {
          chainId: b.chainId, chainName: chainNames[b.chainId] || b.chainId,
          storeId: b.storeId, storeName: b.storeName,
          address: b.address, city: b.city,
          lat: b.lat, lng: b.lng,
          coordSource: 'portal' as const, lastSyncedAt: now,
        } },
        upsert: true,
      },
    }));
    const result = await Branch.bulkWrite(ops, { ordered: false });
    logger.info(`[branches-seed] upserted ${result.upsertedCount + result.modifiedCount}/${KNOWN_BRANCHES.length} branches`);
  } catch (err) {
    logger.error('[branches-seed] check failed:', err);
    seedLoadAttempted = false; // נסה שוב בבקשה הבאה
  }
}

async function getBranches(): Promise<IBranchDoc[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.branches;
  await ensureSeedLoaded();
  // שדות הכרחיים בלבד - מפחית payload מ-DB ומהירות טעינה לזיכרון
  const all = await Branch.find(
    {},
    { chainId: 1, chainName: 1, storeId: 1, storeName: 1, address: 1, city: 1, lat: 1, lng: 1, coordSource: 1 }
  ).lean();
  cache = { branches: all as unknown as IBranchDoc[], loadedAt: Date.now() };
  return cache.branches;
}

export function invalidateBranchCache(): void {
  cache = null;
}

// מחזיר את הסניף הקרוב ביותר לרשת נתונה. אם יש שני סניפים במרחק דומה
// (פער < 2 ק"מ), מעדיפים את זה עם כתובת מלאה — הלקוח יודע איפה זה.
export async function findNearestBranch(chainId: ChainId, user: UserLocation): Promise<NearestBranch | null> {
  const all = await getBranches();
  // 1. אוספים את כל הסניפים של הרשת עם קואורדינטות (לחישוב מרחק)
  const withCoords: Array<{ b: IBranchDoc; dist: number }> = [];
  // 2. סניפים עם כתובת אבל ללא קואורדינטות - מוצגים כ-fallback
  const addressOnly: IBranchDoc[] = [];
  for (const b of all) {
    if (b.chainId !== chainId) continue;
    // סינון: סניף בלי קואורדינטות וגם בלי כתובת וגם בלי עיר - אין מה
    // להציג ללקוח (אי-אפשר לחשב מרחק, אי-אפשר לנווט). מסונן החוצה.
    const hasCoords = typeof b.lat === 'number' && typeof b.lng === 'number';
    const hasLocation = !!(b.address || b.city);
    if (!hasCoords && !hasLocation) continue;
    // עקרון אמינות: coordSource='unknown' = מרכז עיר, לא נקודה אמיתית.
    // לא משתמשים בו לחישוב מרחק (זה היה מטעה את הלקוח). מטפלים בו כסניף
    // עם כתובת בלבד - הלקוח יראה את הכתובת ולחצן 'ניווט לפי כתובת',
    // בלי מספר ק"מ שגוי.
    // portal/geocoded/manual = מדויק מספיק להצגת מרחק.
    const isPreciseCoords = hasCoords && b.coordSource !== 'unknown';
    if (isPreciseCoords) {
      withCoords.push({ b, dist: haversineKm(user, { lat: b.lat!, lng: b.lng! }) });
    } else if (hasLocation) {
      addressOnly.push(b);
    }
  }

  // אם יש סניפים עם קואורדינטות - מחזירים את הקרוב ביותר
  if (withCoords.length > 0) {
    withCoords.sort((x, y) => {
      const xHasInfo = (x.b.address || x.b.city) ? 1 : 0;
      const yHasInfo = (y.b.address || y.b.city) ? 1 : 0;
      if (Math.abs(x.dist - y.dist) > 2) return x.dist - y.dist;
      if (xHasInfo !== yHasInfo) return yHasInfo - xHasInfo;
      return x.dist - y.dist;
    });
    const { b: best, dist: bestDist } = withCoords[0];
    // coordSource='unknown' = מרכז עיר, לא נקודה אמיתית. מסמנים שזו הערכה
    // כדי שהלקוח יציג סימן ברור (~/בערך) ולא יטעה את המשתמש.
    const isApproximate = best.coordSource === 'unknown';
    return {
      branchName: best.storeName,
      city: best.city || '',
      address: best.address || '',
      lat: best.lat!,
      lng: best.lng!,
      distanceKm: Math.round(bestDist * 10) / 10,
      isApproximate: isApproximate || undefined,
    };
  }

  // אין קואורדינטות אמיתיות - מחזירים סניף ראשון עם כתובת, ללא מרחק.
  // לא מציגים הערכה של "מרכז עיר" כי זה לא מדויק ומטעה את המשתמש.
  // הסניפים האלה יקבלו lat/lng אמיתיים בקרון הלילי (geocoding דרך Nominatim).
  if (addressOnly.length > 0) {
    const best = addressOnly[0];
    return {
      branchName: best.storeName,
      city: best.city || '',
      address: best.address || '',
      // ללא lat/lng/distanceKm - הקליינט יציג בלי מרחק (ניווט לפי כתובת)
    };
  }

  return null;
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

// שדה קליל של סניף למפה ציבורית - בלי storeId/coordSource/lastSyncedAt וכו'
// (שדות פנימיים שלא רלוונטיים/בטוחים ללקוח).
export interface NearbyBranch {
  chainId: ChainId;
  chainName: string;
  storeName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

// 500 סניפים בלי סינון מרחק זה גם payload כבד ברשת וגם 500 markers של
// Leaflet לרנדר בו-זמנית (איטי במיוחד במכשירים חלשים) - זו הסיבה המרכזית
// ל"המפה לוקחת המון זמן להיטען" למשתמש שעדיין לא אישר מיקום. 100 מספיק
// כדי לתת תמונה ארצית סבירה בלי לגרור עלות רנדור/רשת שלא נחוצה.
const NEARBY_NO_LOCATION_LIMIT = 100;

function toNearbyBranch(b: IBranchDoc): NearbyBranch {
  return {
    chainId: b.chainId,
    chainName: b.chainName,
    storeName: b.storeName,
    address: b.address || '',
    city: b.city || '',
    lat: b.lat!,
    lng: b.lng!,
  };
}

// סניפים למפה ציבורית (ללא אימות אדמין). אם יש מיקום משתמש - מסננים
// לפי רדיוס (haversine, כמו findNearestBranch). בלי מיקום - מגבילים
// למספר קבוע כדי שהאנדפוינט לא ישמש לשליפת כל טבלת הסניפים בבת אחת.
export async function getNearbyBranches(
  user: UserLocation | null,
  radiusKm: number
): Promise<NearbyBranch[]> {
  const all = await getBranches();
  const withCoords = all.filter(b => typeof b.lat === 'number' && typeof b.lng === 'number');

  if (user) {
    return withCoords
      .map(b => ({ b, dist: haversineKm(user, { lat: b.lat!, lng: b.lng! }) }))
      .filter(({ dist }) => dist <= radiusKm)
      .sort((x, y) => x.dist - y.dist)
      .map(({ b }) => toNearbyBranch(b));
  }

  return withCoords.slice(0, NEARBY_NO_LOCATION_LIMIT).map(toNearbyBranch);
}
