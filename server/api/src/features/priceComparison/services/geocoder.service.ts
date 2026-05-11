/**
 * Geocoder - ממיר address+city ל-lat/lng דרך Nominatim (OpenStreetMap).
 * שימוש חינמי עם מדיניות של 1 בקשה/שנייה - אסור לחרוג, הם יחסמו.
 *
 * הפתרון מיועד לסניפים שבקובצי Stores.xml של הרשתות אין להם קואורדינטות.
 * התוצאה נשמרת במסד (coordSource='geocoded') ולא מחושבת שוב.
 */

import axios from 'axios';
import { logger } from '../../../config/logger';
import { env } from '../../../config/environment';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const LOCATIONIQ_URL = 'https://eu1.locationiq.com/v1/search';
const USER_AGENT = 'smart-basket-branches/1.0 (price-comparison feature)';
const NOMINATIM_MIN_DELAY_MS = 1100; // 1 בקשה/שנייה אצל Nominatim
const LOCATIONIQ_MIN_DELAY_MS = 550;  // 2 בקשות/שנייה במסלול החינמי

let nominatimLastRequestAt = 0;
let locationiqLastRequestAt = 0;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export interface GeocodeResult {
  lat: number;
  lng: number;
}

// קואורדינטות מקורבות של ערים גדולות בישראל - נופל אליהן אם ה-API נכשל
// או אם הכתובת מעורפלת מדי. עדיף בערך נכון מ-null, אבל מסמנים coordSource='unknown'.
const FALLBACK_CITY_COORDS: Record<string, GeocodeResult> = {
  'תל אביב': { lat: 32.0853, lng: 34.7818 },
  'תל-אביב': { lat: 32.0853, lng: 34.7818 },
  'תל אביב-יפו': { lat: 32.0667, lng: 34.7647 },
  'ירושלים': { lat: 31.7683, lng: 35.2137 },
  'חיפה': { lat: 32.7940, lng: 34.9896 },
  'ראשון לציון': { lat: 31.9642, lng: 34.8047 },
  'פתח תקווה': { lat: 32.0878, lng: 34.8878 },
  'אשדוד': { lat: 31.8044, lng: 34.6553 },
  'נתניה': { lat: 32.3215, lng: 34.8532 },
  'באר שבע': { lat: 31.2518, lng: 34.7915 },
  'בני ברק': { lat: 32.0809, lng: 34.8338 },
  'חולון': { lat: 32.0158, lng: 34.7874 },
  'רמת גן': { lat: 32.0684, lng: 34.8248 },
  'אשקלון': { lat: 31.6693, lng: 34.5715 },
  'רחובות': { lat: 31.8928, lng: 34.8113 },
  'בת ים': { lat: 32.0167, lng: 34.7500 },
  'הרצליה': { lat: 32.1624, lng: 34.8443 },
  'כפר סבא': { lat: 32.1782, lng: 34.9073 },
  'חדרה': { lat: 32.4340, lng: 34.9196 },
  'מודיעין': { lat: 31.8928, lng: 35.0100 },
  'נצרת': { lat: 32.7021, lng: 35.2978 },
  'רמלה': { lat: 31.9288, lng: 34.8667 },
  'לוד': { lat: 31.9516, lng: 34.8881 },
  'גבעתיים': { lat: 32.0716, lng: 34.8099 },
  'רעננה': { lat: 32.1847, lng: 34.8708 },
  'אילת': { lat: 29.5580, lng: 34.9482 },
  'עפולה': { lat: 32.6097, lng: 35.2890 },
  'טבריה': { lat: 32.7922, lng: 35.5312 },
  'כרמיאל': { lat: 32.9185, lng: 35.2934 },
  'נהריה': { lat: 33.0058, lng: 35.0942 },
  'קרית גת': { lat: 31.6100, lng: 34.7642 },
  'דימונה': { lat: 31.0700, lng: 35.0327 },
  'שדרות': { lat: 31.5243, lng: 34.5947 },
  'אופקים': { lat: 31.3139, lng: 34.6204 },
  'נתיבות': { lat: 31.4227, lng: 34.5876 },
  'בית שמש': { lat: 31.7502, lng: 34.9860 },
  'מעלה אדומים': { lat: 31.7694, lng: 35.2985 },
  'ביתר עילית': { lat: 31.6953, lng: 35.1167 },
  'מודיעין עילית': { lat: 31.9330, lng: 35.0403 },
  'שער בנימין': { lat: 31.8773, lng: 35.2623 },
  'אלון שבות': { lat: 31.6548, lng: 35.1326 },
  'אריאל': { lat: 32.1044, lng: 35.1721 },
  'בית אל': { lat: 31.9327, lng: 35.2343 },
  'עופרה': { lat: 31.9553, lng: 35.2930 },
  'קרני שומרון': { lat: 32.1796, lng: 35.0935 },
  'כוכב יעקב': { lat: 31.9115, lng: 35.2530 },
  'אפרת': { lat: 31.6540, lng: 35.1589 },
  'אלעד': { lat: 32.0525, lng: 34.9520 },
  'עמנואל': { lat: 32.1594, lng: 35.1364 },
  'קרית ביאליק': { lat: 32.8437, lng: 35.0811 },
  'קרית מוצקין': { lat: 32.8363, lng: 35.0835 },
  'קרית אתא': { lat: 32.8053, lng: 35.1031 },
  'עכו': { lat: 32.9281, lng: 35.0818 },
  'נס ציונה': { lat: 31.9293, lng: 34.7985 },
  'הוד השרון': { lat: 32.1543, lng: 34.8912 },
  'רמת השרון': { lat: 32.1466, lng: 34.8366 },
  'פרדס חנה כרכור': { lat: 32.4726, lng: 34.9707 },
  'פרדס חנה-כרכור': { lat: 32.4726, lng: 34.9707 },
  'צפת': { lat: 32.9620, lng: 35.4960 },
  'ערד': { lat: 31.2612, lng: 35.2120 },
  'ירוחם': { lat: 30.9878, lng: 34.9272 },
  'מצפה רמון': { lat: 30.6100, lng: 34.8000 },
  'בית שאן': { lat: 32.4970, lng: 35.4989 },
  'נוף הגליל': { lat: 32.7070, lng: 35.3162 },
  'רכסים': { lat: 32.7449, lng: 35.0902 },
  'שילה': { lat: 32.0560, lng: 35.2920 },
  'עלי': { lat: 32.0653, lng: 35.2980 },
  'קדומים': { lat: 32.1787, lng: 35.1046 },
  'פסגות': { lat: 31.9005, lng: 35.2770 },
  'נחליאל': { lat: 31.9790, lng: 35.1230 },
};

export function cityFallbackCoords(city: string | undefined): GeocodeResult | null {
  if (!city) return null;
  const clean = city.trim();
  return FALLBACK_CITY_COORDS[clean] ?? null;
}

// בדיקה שהקואורדינטות בתוך גבולות ישראל (כולל יו"ש ורמת הגולן) -
// מסנן תוצאות שגויות שמחזירות נקודה אקראית בעולם.
const inIsraelBounds = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng)
  && lat >= 29 && lat <= 34
  && lng >= 33 && lng <= 36;

// מרחק haversine בק"מ - שימוש לוולידציה שהתוצאה קרובה לעיר המבוקשת
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// אימות שהתוצאה אכן בעיר המבוקשת - תוצאה רחוקה מ-25 ק"מ ממרכז העיר
// כמעט בוודאות שגויה (Nominatim בלבל בשם דומה בעיר אחרת, למשל "אילת"
// בכתובת קרית-חיים → תוצאה באילת הדרומית).
const MAX_DIST_FROM_CITY_KM = 25;
const validateNearCity = (
  result: GeocodeResult,
  city: string | undefined
): boolean => {
  const center = cityFallbackCoords(city);
  if (!center) return true; // אין נתון השוואה - מקבלים
  const dist = haversineKm(result.lat, result.lng, center.lat, center.lng);
  return dist <= MAX_DIST_FROM_CITY_KM;
};

// וריאציות של הכתובת - אם הכתובת המלאה נכשלת, מנסים גרסאות פשוטות יותר.
// משפר משמעותית את אחוז ההצלחה, במיוחד עם קיצורים ("ת״א" → "תל אביב").
const cleanCity = (city: string | undefined): string => {
  if (!city) return '';
  return city.trim()
    .replace(/^ת["׳]?א$/u, 'תל אביב')
    .replace(/^י["׳]?ם$/u, 'ירושלים')
    .replace(/^ב["׳]?ש$/u, 'באר שבע')
    .replace(/^ר["׳]?ג$/u, 'רמת גן')
    .replace(/^פ["׳]?ת$/u, 'פתח תקווה');
};

const buildQueryVariants = (address: string | undefined, city: string | undefined): string[] => {
  const addr = address?.trim();
  const cty = cleanCity(city);
  const variants: string[] = [];
  // 1. כתובת מלאה + עיר
  if (addr && cty) variants.push(`${addr}, ${cty}, Israel`);
  // 2. רחוב בלי מספר + עיר (לפעמים המספר משבש את החיפוש)
  if (addr && cty) {
    const noNum = addr.replace(/\s+\d+\s*$/, '').trim();
    if (noNum && noNum !== addr) variants.push(`${noNum}, ${cty}, Israel`);
  }
  // 3. רק כתובת (אם אין עיר)
  if (addr && !cty) variants.push(`${addr}, Israel`);
  // לא מנסים רק עיר - זה יחזיר את מרכז העיר ועדיף ליפול ל-cityFallbackCoords
  // המסומן כ-'unknown', במקום לסמן 'geocoded' עם נתון בלתי מדויק.
  return variants;
};

// Nominatim - חינמי, איטי, פחות מדויק בעברית. ניסיון ראשון.
async function tryNominatim(q: string): Promise<GeocodeResult | null> {
  const since = Date.now() - nominatimLastRequestAt;
  if (since < NOMINATIM_MIN_DELAY_MS) await sleep(NOMINATIM_MIN_DELAY_MS - since);
  nominatimLastRequestAt = Date.now();

  try {
    const res = await axios.get<Array<{ lat: string; lon: string }>>(NOMINATIM_URL, {
      params: { q, format: 'json', limit: 1, countrycodes: 'il', 'accept-language': 'he' },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15_000,
    });
    const first = res.data?.[0];
    if (!first) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!inIsraelBounds(lat, lng)) return null;
    return { lat, lng };
  } catch (err) {
    logger.warn(`[geocoder] nominatim failed for "${q}": ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

// LocationIQ - דורש API key. fallback ל-Nominatim. מסלול חינמי: 5K/יום, 2/שנייה.
async function tryLocationIQ(q: string): Promise<GeocodeResult | null> {
  if (!env.LOCATIONIQ_API_KEY) return null;
  const since = Date.now() - locationiqLastRequestAt;
  if (since < LOCATIONIQ_MIN_DELAY_MS) await sleep(LOCATIONIQ_MIN_DELAY_MS - since);
  locationiqLastRequestAt = Date.now();

  try {
    const res = await axios.get<Array<{ lat: string; lon: string }>>(LOCATIONIQ_URL, {
      params: {
        key: env.LOCATIONIQ_API_KEY,
        q,
        format: 'json',
        limit: 1,
        countrycodes: 'il',
        'accept-language': 'he',
      },
      timeout: 15_000,
    });
    const first = res.data?.[0];
    if (!first) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!inIsraelBounds(lat, lng)) return null;
    return { lat, lng };
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    logger.warn(`[geocoder] locationiq failed for "${q}" (status=${status}): ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

// geocode מלא - יש להשתמש בזה רק בתוך תהליכי רקע (לא בבקשת משתמש).
// סדר: Nominatim → LocationIQ (אם יש מפתח) → null. מנסה וריאציות של הכתובת
// כדי להגדיל סיכוי הצלחה לכתובות בעברית (קיצורים, מספרי בית מבלבלים וכו').
// מחזיר null אם כל הניסיונות נכשלו - הקורא יסמן geocodeFailedAt ולא ינסה שוב מיד.
export async function geocodeAddress(
  address: string | undefined,
  city: string | undefined
): Promise<GeocodeResult | null> {
  const variants = buildQueryVariants(address, city);
  if (variants.length === 0) return null;

  // Nominatim עם וולידציה - אם התוצאה רחוקה מהעיר זה כנראה התאמה שגויה
  // (Nominatim מתבלבל לעיתים בשמות רחובות שדומים לשמות ערים אחרות).
  for (const q of variants) {
    const result = await tryNominatim(q);
    if (result && validateNearCity(result, city)) return result;
    if (result) {
      logger.warn(`[geocoder] rejected nominatim result for "${q}" - far from city "${city}"`);
    }
  }
  // Nominatim לא מצא או החזיר תוצאה רחוקה - LocationIQ מדויק יותר לעברית.
  // מנסים על כל הוריאציות (לא רק הראשונה) כי כשל Nominatim לעיתים מצביע
  // על כתובת מורכבת ש-LocationIQ יסתדר איתה.
  if (env.LOCATIONIQ_API_KEY) {
    for (const q of variants) {
      const result = await tryLocationIQ(q);
      if (result && validateNearCity(result, city)) return result;
      if (result) {
        logger.warn(`[geocoder] rejected locationiq result for "${q}" - far from city "${city}"`);
      }
    }
  }
  return null;
}
