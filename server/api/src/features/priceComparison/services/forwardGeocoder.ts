/**
 * forwardGeocoder.ts - כתובת+עיר → קואורדינטות, דרך Nominatim (ראשון) ואז
 * LocationIQ (אם יש מפתח). יש להשתמש רק בתהליכי רקע (לא בבקשת משתמש) בגלל
 * rate limiting (1 req/s ב-Nominatim).
 */

import axios from 'axios';
import { logger } from '../../../config/logger';
import { env } from '../../../config/environment';
import { NOMINATIM_URL, LOCATIONIQ_URL, USER_AGENT, waitForNominatimSlot, waitForLocationIQSlot, inIsraelBounds, type GeocodeResult } from './geocoderShared';
import { isJunkCity, findKnownCityIn, validateNearCity } from './cityMatching';

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
  await waitForNominatimSlot();

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
  await waitForLocationIQSlot();

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
  city: string | undefined,
  storeName?: string | undefined
): Promise<GeocodeResult | null> {
  // אם השדה city מכיל זבל (מיקוד/אפס/ריק) - נסה לחלץ שם עיר מהכתובת
  // ומשם הסניף. הרבה רשתות שמות שם פוסטל קוד או store ID בשדה city.
  // שם הסניף הוא רמז חזק (לדוגמה: storeName='עפולה' עם city='7700').
  let effectiveCity = city;
  if (isJunkCity(city)) {
    const extracted = findKnownCityIn([address, storeName].filter(Boolean).join(' '));
    if (extracted) {
      effectiveCity = extracted;
    }
  }
  const variants = buildQueryVariants(address, effectiveCity);
  if (variants.length === 0) return null;

  // Nominatim עם וולידציה - אם התוצאה רחוקה מהעיר זה כנראה התאמה שגויה
  // (Nominatim מתבלבל לעיתים בשמות רחובות שדומים לשמות ערים אחרות).
  for (const q of variants) {
    const result = await tryNominatim(q);
    if (result && validateNearCity(result, effectiveCity)) return result;
    if (result) {
      logger.warn(`[geocoder] rejected nominatim result for "${q}" - far from city "${effectiveCity}"`);
    }
  }
  // Nominatim לא מצא או החזיר תוצאה רחוקה - LocationIQ מדויק יותר לעברית.
  // מנסים על כל הוריאציות (לא רק הראשונה) כי כשל Nominatim לעיתים מצביע
  // על כתובת מורכבת ש-LocationIQ יסתדר איתה.
  if (env.LOCATIONIQ_API_KEY) {
    for (const q of variants) {
      const result = await tryLocationIQ(q);
      if (result && validateNearCity(result, effectiveCity)) return result;
      if (result) {
        logger.warn(`[geocoder] rejected locationiq result for "${q}" - far from city "${effectiveCity}"`);
      }
    }
  }
  return null;
}
