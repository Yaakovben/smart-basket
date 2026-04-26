/**
 * Geocoder - ממיר address+city ל-lat/lng דרך Nominatim (OpenStreetMap).
 * שימוש חינמי עם מדיניות של 1 בקשה/שנייה - אסור לחרוג, הם יחסמו.
 *
 * הפתרון מיועד לסניפים שבקובצי Stores.xml של הרשתות אין להם קואורדינטות.
 * התוצאה נשמרת במסד (coordSource='geocoded') ולא מחושבת שוב.
 */

import axios from 'axios';
import { logger } from '../../../config/logger';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'smart-basket-branches/1.0 (price-comparison feature)';
const MIN_DELAY_MS = 1100; // הגבלה של Nominatim - 1 בקשה/שנייה, שומרים ביטחון

let lastRequestAt = 0;

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

// geocode מלא דרך Nominatim - יש להשתמש בזה רק בתוך תהליכי רקע (לא בבקשת משתמש).
// מחזיר null אם Nominatim לא מצא או ה-API כשל.
export async function geocodeAddress(
  address: string | undefined,
  city: string | undefined
): Promise<GeocodeResult | null> {
  const q = [address, city, 'Israel'].filter(Boolean).join(', ');
  if (!q.trim() || q === 'Israel') return null;

  // throttling: לא יותר מבקשה אחת בשנייה
  const since = Date.now() - lastRequestAt;
  if (since < MIN_DELAY_MS) await sleep(MIN_DELAY_MS - since);
  lastRequestAt = Date.now();

  try {
    const res = await axios.get<Array<{ lat: string; lon: string }>>(NOMINATIM_URL, {
      params: {
        q,
        format: 'json',
        limit: 1,
        countrycodes: 'il',
        'accept-language': 'he',
      },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15_000,
    });
    const first = res.data?.[0];
    if (!first) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    // תוקף לישראל
    if (lat < 29 || lat > 34 || lng < 33 || lng > 36) return null;
    return { lat, lng };
  } catch (err) {
    logger.warn(`[geocoder] nominatim failed for "${q}": ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}
