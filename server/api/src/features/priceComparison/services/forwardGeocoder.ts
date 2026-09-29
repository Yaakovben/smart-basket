/**
 * forwardGeocoder.ts - כתובת+עיר → קואורדינטות, דרך Nominatim (ראשון) ואז
 * LocationIQ (אם יש מפתח). יש להשתמש רק בתהליכי רקע (לא בבקשת משתמש) בגלל
 * rate limiting (1 req/s ב-Nominatim).
 */

import axios from 'axios';
import { logger } from '../../../config/logger';
import { env } from '../../../config/environment';
import { NOMINATIM_URL, LOCATIONIQ_URL, USER_AGENT, waitForNominatimSlot, waitForLocationIQSlot, inIsraelBounds, type GeocodeResult } from './geocoderShared';
import { isJunkCity, findKnownCityIn, validateNearCity, coordsConflictWithName, isCountryCentroid, isArtifactCity, exactCityFromStoreName, findCbsLocalityIn } from './cityMatching';

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

interface SearchHit {
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  place_rank?: number | string;
  name?: string;
  display_name?: string;
}

// תוצאה ברמת רחוב, בניין או חנות, ולא מרכז של יישוב/מועצה. בלי הבדיקה הזו התקבלו
// מרכזי ערים כ"מיקום סניף": 279 סניפים ישבו על 103 נקודות משותפות (רמי לוי "עטרות"
// ועוד 14 סניפים במרכז מועצה אזורית זבולון). place_rank של Nominatim: 26 ומעלה = רחוב
// ופחות; ל-LocationIQ אין אותו, ולכן לפי class.
// LocationIQ מחזיר לכתובת שלא מצא את מרכז העיר בלי class בכלל ("Jerusalem, Jerusalem,
// Israel"): 9 סניפים מירושלים ו-5 מרחובות ישבו כך בנקודה אחת. לכן בלי דרגה ובלי class
// = לא מדויק, ו-place מתקבל רק כשהוא בית מסוים.
export function isPreciseHit(hit: Pick<SearchHit, 'class' | 'type' | 'place_rank'>): boolean {
  if (hit.place_rank !== undefined && hit.place_rank !== null && hit.place_rank !== '') {
    return Number(hit.place_rank) >= 26;
  }
  if (!hit.class) return false;
  if (hit.class === 'place') return hit.type === 'house';
  return hit.class !== 'boundary';
}

// Nominatim - חינמי, איטי, פחות מדויק בעברית. ניסיון ראשון.
async function tryNominatim(q: string): Promise<GeocodeResult | null> {
  await waitForNominatimSlot();

  try {
    const res = await axios.get<SearchHit[]>(NOMINATIM_URL, {
      params: { q, format: 'json', limit: 1, countrycodes: 'il', 'accept-language': 'he' },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15_000,
    });
    const first = res.data?.[0];
    if (!first || !isPreciseHit(first)) return null;
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
    const res = await axios.get<SearchHit[]>(LOCATIONIQ_URL, {
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
    if (!first || !isPreciseHit(first)) return null;
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

// מילים משם הסניף שמזהות את החנות (בלי סימונים פנימיים של הרשת כמו "ת.", "זכיין", כוכביות)
const STORE_NAME_NOISE = /[*()"'.,\-־]|\bת\b|\bס\s*מ\b|זכיי?ן|סניף/g;
export function storeNameTokens(storeName: string): string[] {
  return storeName.replace(STORE_NAME_NOISE, ' ').split(/\s+/).filter(t => t.length >= 3 && !/^\d+$/.test(t));
}

// האם תוצאה היא חנות ששמה תואם את הסניף: לפחות מילה אחת משם הסניף (שאינה העיר)
export function poiMatchesStore(hit: Pick<SearchHit, 'class' | 'name' | 'display_name'>, storeName: string, town: string): boolean {
  if (hit.class !== 'shop') return false;
  const hay = `${hit.name ?? ''} ${hit.display_name ?? ''}`;
  const townWords = new Set(town.split(/\s+/));
  return storeNameTokens(storeName).some(t => !townWords.has(t) && hay.includes(t));
}

// סניף בלי כתובת שמישה (סופר ספיר מפרסמת "unknown"): חיפוש החנות עצמה לפי שמה והיישוב.
// מתקבלת רק תוצאה שהיא חנות, ששמה תואם את הסניף, ושלא סותרת את היישוב.
async function tryStorePoi(storeName: string, town: string): Promise<GeocodeResult | null> {
  const name = storeNameTokens(storeName).join(' ');
  if (!name) return null;
  await waitForNominatimSlot();
  try {
    const res = await axios.get<SearchHit[]>(NOMINATIM_URL, {
      params: { q: `${name}, ${town}, Israel`, format: 'json', limit: 5, countrycodes: 'il', 'accept-language': 'he' },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15_000,
    });
    for (const hit of res.data ?? []) {
      if (!poiMatchesStore(hit, storeName, town)) continue;
      const lat = parseFloat(hit.lat);
      const lng = parseFloat(hit.lon);
      if (!inIsraelBounds(lat, lng)) continue;
      if (!validateNearCity({ lat, lng }, town) || coordsConflictWithName(lat, lng, storeName)) continue;
      return { lat, lng };
    }
    return null;
  } catch (err) {
    logger.warn(`[geocoder] store poi search failed for "${name}, ${town}": ${err instanceof Error ? err.message : 'unknown'}`);
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
  // כתובת שהיא לא כתובת ("unknown", "0", אתר אינטרנט): לא שולחים לגיאוקודר
  const cleanAddress = address && !/^\s*(unknown|0+|-|\?|www\.|https?:)/i.test(address) ? address : undefined;
  let effectiveCity = isArtifactCity(city) ? undefined : city;
  // שם הסניף הוא בדיוק שם של יישוב: הוא הקובע, גם אם שדה העיר אחר (בעבר הושלם
  // שדה העיר מחיפוש הפוך של מיקום שגוי, למשל סניף "עכו" עם העיר ראשון לציון)
  const exact = exactCityFromStoreName(storeName);
  if (exact) {
    effectiveCity = exact;
  } else if (isJunkCity(effectiveCity)) {
    const text = [cleanAddress, storeName].filter(Boolean).join(' ');
    const extracted = findKnownCityIn(text) ?? findCbsLocalityIn(text);
    if (extracted) effectiveCity = extracted;
  }
  const variants = buildQueryVariants(cleanAddress, effectiveCity);
  // בלי כתובת שמישה: חיפוש החנות לפי שמה ביישוב
  if (variants.length === 0) {
    return storeName && effectiveCity && !isJunkCity(effectiveCity) ? tryStorePoi(storeName, effectiveCity) : null;
  }
  // תוצאה תקינה: קרובה לעיר, לא "מרכז המדינה" (מה שחוזר לכתובת שלא נמצאה), ולא
  // סותרת את העיר בשם הסניף. בלי זה נשמרו עשרות סניפים בנקודת ברירת מחדל בנגב.
  const acceptable = (r: GeocodeResult) =>
    validateNearCity(r, effectiveCity) && !isCountryCentroid(r.lat, r.lng) && !coordsConflictWithName(r.lat, r.lng, storeName);

  // Nominatim עם וולידציה - אם התוצאה רחוקה מהעיר זה כנראה התאמה שגויה
  // (Nominatim מתבלבל לעיתים בשמות רחובות שדומים לשמות ערים אחרות).
  for (const q of variants) {
    const result = await tryNominatim(q);
    if (result && acceptable(result)) return result;
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
      if (result && acceptable(result)) return result;
      if (result) {
        logger.warn(`[geocoder] rejected locationiq result for "${q}" - far from city "${effectiveCity}"`);
      }
    }
  }
  // הכתובת לא נמצאה ברמת רחוב: ניסיון אחרון לפי שם החנות ביישוב
  if (storeName && effectiveCity && !isJunkCity(effectiveCity)) return tryStorePoi(storeName, effectiveCity);
  return null;
}
