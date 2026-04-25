/**
 * osmBranches.service.ts - שאיבת סניפי סופרים מ-OpenStreetMap.
 *
 * משתמשים ב-Overpass API (חינמי, ללא auth) לחיפוש סניפים לפי
 * brand בישראל. הנתונים תחזוקה קהילתית, אמיתיים ועדכניים.
 *
 * מחזירים מבנה תואם ל-Branch DAL כדי שאפשר יהיה לעשות upsert ישיר.
 */

import axios from 'axios';
import { logger } from '../../../config/logger';
import type { ChainId } from '../models/Price.model';

// נקודת הקצה הציבורית של Overpass. חינמי, יציב, מומלץ.
// משתמשים ב-overpass.private.coffee או overpass-api.de - שניהם רץ.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// מיפוי בין chainId שלנו לבין שמות מותג ב-OSM (עברית + אנגלית).
// Overpass תומך ב-regex על ערכי tag, אז אפשר לחפש כמה ואריאנטים בבת אחת.
const CHAIN_BRANDS: Record<ChainId, { hebrew: string[]; english: string[] }> = {
  shufersal:    { hebrew: ['שופרסל'], english: ['Shufersal'] },
  rami_levy:    { hebrew: ['רמי לוי'], english: ['Rami Levy', 'Rami Levi', 'RamiLevy'] },
  yohananof:    { hebrew: ['יוחננוף'], english: ['Yohananof', 'Yochananof'] },
  osher_ad:     { hebrew: ['אושר עד'], english: ['Osher Ad', 'OsherAd'] },
  tiv_taam:     { hebrew: ['טיב טעם'], english: ['Tiv Taam', 'TivTaam'] },
  keshet:       { hebrew: ['קשת'], english: ['Keshet'] },
  stop_market:  { hebrew: ['סטופ מרקט', 'סטופ-מרקט'], english: ['Stop Market', 'StopMarket'] },
  politzer:     { hebrew: ['פוליצר'], english: ['Politzer'] },
  doralon:      { hebrew: ['דור אלון', 'דור-אלון', 'AM:PM'], english: ['Dor Alon', 'Doralon', 'AMPM'] },
};

export interface OsmBranch {
  storeId: string;
  storeName: string;
  city?: string;
  address?: string;
  lat: number;
  lng: number;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  // ב-way/relation אין lat/lon ישירים אלא center
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// בונה שאילתת Overpass: כל ה-supermarkets/convenience בישראל שה-brand
// או name שלהם תואם לאחד הוואריאנטים. כולל nodes ו-ways (סניפים גדולים
// לפעמים מוגדרים כפוליגון של בניין).
function buildOverpassQuery(chainId: ChainId): string {
  const brands = CHAIN_BRANDS[chainId];
  if (!brands) return '';
  const allNames = [...brands.hebrew, ...brands.english];
  // regex case-insensitive על שמות מרובים, מחובר ב-|
  // הבריחה של רגעלי ב-Overpass: רק כפילות " צריכה escape
  const namePattern = allNames.map(n => n.replace(/"/g, '\\"')).join('|');

  // חיפוש רחב: לא מגבילים ל-shop=supermarket בלבד כי הרבה סניפים
  // בישראל מתויגים פשוט בשם בלי tag shop, או כ-shop=convenience/grocery.
  // החיפוש לפי name עובד גם אם אין tag shop בכלל.
  return `
[out:json][timeout:30];
area["ISO3166-1"="IL"]->.il;
(
  node["brand"~"${namePattern}",i](area.il);
  way["brand"~"${namePattern}",i](area.il);
  node["name"~"${namePattern}",i](area.il);
  way["name"~"${namePattern}",i](area.il);
  node["name:he"~"${namePattern}",i](area.il);
  way["name:he"~"${namePattern}",i](area.il);
);
out center tags;
`.trim();
}

// פרסור element של OSM ל-OsmBranch. מחזיר null אם אין קואורדינטות.
function parseElement(el: OverpassElement, chainId: ChainId): OsmBranch | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  // וידוא שהקואורדינטות בישראל
  if (lat < 29 || lat > 34 || lng < 33 || lng > 36) return null;

  const tags = el.tags || {};
  const name = tags['name:he'] || tags.name || tags.brand || chainId;
  // כתובת ב-OSM: addr:street + addr:housenumber
  const addrParts = [
    tags['addr:street'] || tags['addr:place'],
    tags['addr:housenumber'],
  ].filter(Boolean);
  const address = addrParts.length > 0 ? addrParts.join(' ') : undefined;
  const city = tags['addr:city'] || tags['addr:suburb'] || tags.city;

  return {
    storeId: `osm-${el.type}-${el.id}`, // מזהה ייחודי מ-OSM
    storeName: name,
    city,
    address,
    lat,
    lng,
  };
}

/**
 * מביא את כל הסניפים של רשת ספציפית מ-OSM.
 * מחזיר מערך ריק אם אין נתונים או שהשרת חזר בשגיאה.
 */
export async function fetchOsmBranches(chainId: ChainId): Promise<OsmBranch[]> {
  const query = buildOverpassQuery(chainId);
  if (!query) return [];

  try {
    const res = await axios.post<OverpassResponse>(
      OVERPASS_URL,
      `data=${encodeURIComponent(query)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 60_000,
      }
    );
    const elements = res.data?.elements || [];
    const branches: OsmBranch[] = [];
    const seen = new Set<string>();
    for (const el of elements) {
      const b = parseElement(el, chainId);
      if (!b) continue;
      // de-duplication: אם אותו מקום מופיע גם כ-node וגם כ-way (אותו lat/lng עד 4 ספרות)
      const key = `${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      branches.push(b);
    }
    logger.info(`[osm-branches] ${chainId}: fetched ${branches.length} branches`);
    return branches;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logger.error(`[osm-branches] ${chainId}: failed to fetch from OSM: ${msg}`);
    return [];
  }
}

/**
 * סנכרון מ-OSM של כל הרשתות הרשומות. רץ ברצף עם דיליי בין רשת לרשת
 * (Overpass מאפשר ~2 שאילתות בדקה ב-IP אחד).
 */
export async function fetchAllChainsFromOsm(
  chainIds: ChainId[]
): Promise<Map<ChainId, OsmBranch[]>> {
  const result = new Map<ChainId, OsmBranch[]>();
  for (let i = 0; i < chainIds.length; i++) {
    const chainId = chainIds[i];
    if (i > 0) await new Promise(r => setTimeout(r, 4_000)); // שמירה על מגבלת קצב
    const branches = await fetchOsmBranches(chainId);
    result.set(chainId, branches);
  }
  return result;
}
