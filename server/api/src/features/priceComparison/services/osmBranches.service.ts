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

// נקודות קצה ציבוריות של Overpass. חינמיות, יציבות.
// אם הראשון נופל (rate limit / down), נופלים לבא בתור.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

// מיפוי בין chainId שלנו לבין שמות מותג כפי שהם מופיעים ב-OSM.
// אומת ע"י קריאות ישירות ל-Overpass: ה-brand ב-OSM הוא בד"כ באנגלית.
// נוספו וריאציות רבות (כתיב חלופי, כינויי-משנה, שמות עבריים מקוצרים)
// כדי לתפוס סניפים עם תיוג שונה בקהילת OSM.
const CHAIN_BRANDS: Record<ChainId, { brands: string[]; names: string[] }> = {
  shufersal: {
    brands: ['Shufersal', 'Shufersal Deal', 'Shufersal Express', 'Shufersal Yesh', 'Shufersal Sheli', 'Yesh', 'BE Pharm'],
    names: ['שופרסל', 'שופרסל דיל', 'שופרסל אקספרס', 'שופרסל יש', 'שופרסל שלי', 'שופרסל בי', 'יש'],
  },
  rami_levy: {
    brands: ['Rami Levy', 'Rami Levi', 'Rami Levy Hashikma', 'Rami Levy Shivuk Hashikma'],
    names: ['רמי לוי', 'רמי לוי שיווק השקמה', 'רמי לוי-שיווק השקמה'],
  },
  yohananof: {
    brands: ['Yohananof', 'Yochananof', 'Yohanannof', "M. Yohananof", 'M Yohananof'],
    names: ['יוחננוף', 'יוחננוף ובניו', 'מ. יוחננוף', 'מ יוחננוף'],
  },
  osher_ad: {
    brands: ['Osher Ad', 'Osher-Ad', 'OsherAd'],
    names: ['אושר עד', 'אושר-עד'],
  },
  tiv_taam: {
    brands: ["Tiv Ta'am", 'Tiv Taam', 'Tivtaam', 'TivTaam'],
    names: ['טיב טעם', 'טיב-טעם'],
  },
  keshet: {
    brands: ['Keshet', 'Keshet Teamim', 'Keshet Market'],
    names: ['קשת טעמים', 'קשת', 'קשת מרקט', 'רשת קשת'],
  },
  stop_market: {
    brands: ['Stop Market', 'Stop-Market', 'StopMarket', 'STOP'],
    names: ['סטופ מרקט', 'סטופ-מרקט', 'STOP MARKET'],
  },
  politzer: {
    brands: ['Politzer', 'Polizer', 'Politser'],
    names: ['פוליצר', 'פולצר'],
  },
  doralon: {
    brands: ['Dor Alon', 'Dor-Alon', 'AM:PM', 'AMPM', 'AM/PM', 'AM PM'],
    names: ['דור אלון', 'דור-אלון', 'AM:PM', 'אם פי אם', 'אם:פי:אם'],
  },
  victory: {
    brands: ['Victory', 'Victory Supermarket', 'Victory Hyper'],
    names: ['ויקטורי', 'ויקטורי היפר', 'ויקטורי סופר'],
  },
  maayan_2000: {
    brands: ['Maayan 2000', 'Maayan2000', 'Mayan 2000'],
    names: ['מעיין 2000', 'מעיין2000', 'מעיין אלפיים', 'מעין 2000'],
  },
  shefa_birkat_hashem: {
    brands: ['Shefa Birkat Hashem', 'Shefa Birkat HaShem', 'ShefaBirkatHashem', 'Shefa'],
    names: ['שפע ברכת השם', 'שפע ברכת ה׳', 'שפע ברכת ה׳ה', 'שפע'],
  },
  super_sapir: {
    brands: ['Super Sapir', 'SuperSapir', 'Sapir'],
    names: ['סופר ספיר', 'ספיר', 'רשת ספיר'],
  },
  carrefour: {
    brands: ['Carrefour', 'Yaynot Bitan', 'Yaynot Bitan Carrefour', 'Yenot Bitan', 'Mega', 'Mega Bool', "Mega Ba'Ir"],
    names: ['קרפור', 'יינות ביתן', 'יינות ביתן Carrefour', 'מגה', 'מגה בעיר', 'מגה בול'],
  },
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

// בונה שאילתת Overpass לישראל. שימוש ב-bbox (29,34,34,36) במקום
// area["ISO3166-1"="IL"] - האחרון לא עובד אצל הרבה endpoints מסיבה
// לא ברורה. ה-bbox הוא של ישראל (29-34 lat, 34-36 lng).
const ISRAEL_BBOX = '(29,34,34,36)';

function buildOverpassQuery(chainId: ChainId): string {
  const conf = CHAIN_BRANDS[chainId];
  if (!conf) return '';
  // brand: התאמה מדויקת (אנגלית, עוזר ל-shufersal, tiv_taam, וכו')
  // name: regex (עברית, חיפוש רחב לסניפים שאין להם brand tag)
  const brandClauses = conf.brands.flatMap(b => {
    const escaped = b.replace(/"/g, '\\"');
    return [
      `node["brand"="${escaped}"]${ISRAEL_BBOX};`,
      `way["brand"="${escaped}"]${ISRAEL_BBOX};`,
    ];
  });
  const namePattern = conf.names.map(n => n.replace(/"/g, '\\"')).join('|');
  const nameClauses = namePattern ? [
    `node["name"~"${namePattern}"]${ISRAEL_BBOX};`,
    `way["name"~"${namePattern}"]${ISRAEL_BBOX};`,
  ] : [];

  return `[out:json][timeout:25];(${[...brandClauses, ...nameClauses].join('')});out center tags;`;
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

// ניסיון לבצע שאילתה מול endpoint יחיד של Overpass. מחזיר elements או זורק.
async function tryOverpassEndpoint(
  endpoint: string,
  query: string
): Promise<OverpassElement[]> {
  const res = await axios.post<OverpassResponse>(
    endpoint,
    `data=${encodeURIComponent(query)}`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'smart-basket-app/1.0 (price comparison feature)',
      },
      timeout: 20_000,
    }
  );
  return res.data?.elements || [];
}

/**
 * מביא את כל הסניפים של רשת ספציפית מ-OSM.
 * מנסה כמה nodes ציבוריים של Overpass ברצף עד שאחד מצליח.
 * מחזיר מערך ריק אם כולם נכשלו (לוג מפורט בלוגים).
 */
export async function fetchOsmBranches(chainId: ChainId): Promise<OsmBranch[]> {
  const query = buildOverpassQuery(chainId);
  if (!query) return [];

  let lastError = 'unknown';
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const elements = await tryOverpassEndpoint(endpoint, query);
      const branches: OsmBranch[] = [];
      const seen = new Set<string>();
      for (const el of elements) {
        const b = parseElement(el, chainId);
        if (!b) continue;
        const key = `${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        branches.push(b);
      }
      logger.info(`[osm-branches] ${chainId}: fetched ${branches.length} from ${endpoint}`);
      return branches;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'unknown';
      logger.warn(`[osm-branches] ${chainId}: ${endpoint} failed (${lastError}), trying next`);
    }
  }
  logger.error(`[osm-branches] ${chainId}: all overpass endpoints failed. Last error: ${lastError}`);
  return [];
}

/**
 * סנכרון מ-OSM של כל הרשתות הרשומות.
 * רץ במקביל - 4 endpoints שונים מאפשרים פיזור עומס.
 * Render מגביל לבקשת HTTP ל-30 שניות, לכן רצינו לסיים מהר.
 *
 * האסטרטגיה: כל רשת מנסה את ה-endpoints ברצף (fetchOsmBranches עושה את זה),
 * אבל הרשתות עצמן רצות במקביל. זמן כולל ~5-10 שניות במקום 50.
 */
export async function fetchAllChainsFromOsm(
  chainIds: ChainId[]
): Promise<Map<ChainId, OsmBranch[]>> {
  const result = new Map<ChainId, OsmBranch[]>();
  const promises = chainIds.map(async (chainId) => {
    const branches = await fetchOsmBranches(chainId);
    return [chainId, branches] as const;
  });
  const settled = await Promise.allSettled(promises);
  for (const item of settled) {
    if (item.status === 'fulfilled') {
      const [chainId, branches] = item.value;
      result.set(chainId, branches);
    }
  }
  return result;
}
