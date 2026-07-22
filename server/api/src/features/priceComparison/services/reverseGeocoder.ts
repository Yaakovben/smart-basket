/**
 * reverseGeocoder.ts - קואורדינטות → כתובת, דרך LocationIQ (מועדף, איכות טובה
 * יותר לעברית) עם נפילה ל-Nominatim.
 */

import axios from 'axios';
import { logger } from '../../../config/logger';
import { env } from '../../../config/environment';
import { NOMINATIM_REVERSE_URL, LOCATIONIQ_REVERSE_URL, USER_AGENT, waitForNominatimSlot, waitForLocationIQSlot, inIsraelBounds } from './geocoderShared';

export interface ReverseGeocodeResult {
  address: string;
  city: string;
}

// reverse דרך LocationIQ - מועדף כי איכותו טובה לעברית.
// מחזיר אובייקט עם שם רחוב+מספר (address) ושם עיר (city).
async function reverseLocationIQ(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!env.LOCATIONIQ_API_KEY) return null;
  await waitForLocationIQSlot();

  try {
    const res = await axios.get<{ address?: Record<string, string>; display_name?: string }>(LOCATIONIQ_REVERSE_URL, {
      params: {
        key: env.LOCATIONIQ_API_KEY,
        lat, lon: lng,
        format: 'json',
        'accept-language': 'he',
        normalizeaddress: 1,
      },
      timeout: 15_000,
    });
    const a = res.data?.address || {};
    let street = a.road || a.street || a.pedestrian || '';
    const houseNumber = a.house_number || '';
    const city = a.city || a.town || a.village || a.municipality || a.suburb || '';
    // לפעמים ה-API מחזיר מספר טהור בשדה road (מיקוד שהוכנס בטעות). מתעלמים
    // משם רחוב שאינו מכיל לפחות אות אחת בעברית או באנגלית.
    if (street && !/[֐-׿a-zA-Z]/.test(street)) {
      street = '';
    }
    const address = street ? [street, houseNumber].filter(Boolean).join(' ').trim() : '';
    if (!address && !city) return null;
    return { address, city };
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    logger.warn(`[geocoder] reverse locationiq failed for ${lat},${lng} (status=${status}): ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

// reverse דרך Nominatim - fallback. איטי יותר.
async function reverseNominatim(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  await waitForNominatimSlot();

  try {
    const res = await axios.get<{ address?: Record<string, string> }>(NOMINATIM_REVERSE_URL, {
      params: { lat, lon: lng, format: 'json', 'accept-language': 'he', zoom: 18 },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15_000,
    });
    const a = res.data?.address || {};
    let street = a.road || a.street || a.pedestrian || '';
    const houseNumber = a.house_number || '';
    const city = a.city || a.town || a.village || a.municipality || a.suburb || '';
    // לפעמים ה-API מחזיר מספר טהור בשדה road (מיקוד שהוכנס בטעות). מתעלמים
    // משם רחוב שאינו מכיל לפחות אות אחת בעברית או באנגלית.
    if (street && !/[֐-׿a-zA-Z]/.test(street)) {
      street = '';
    }
    const address = street ? [street, houseNumber].filter(Boolean).join(' ').trim() : '';
    if (!address && !city) return null;
    return { address, city };
  } catch (err) {
    logger.warn(`[geocoder] reverse nominatim failed for ${lat},${lng}: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

// reverse geocoding מלא: lat/lng → כתובת. LocationIQ ראשון (איכות יותר טובה
// לעברית), Nominatim fallback. מחזיר null אם שניהם נכשלו.
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!inIsraelBounds(lat, lng)) return null;
  const fromLocationIQ = await reverseLocationIQ(lat, lng);
  if (fromLocationIQ) return fromLocationIQ;
  return reverseNominatim(lat, lng);
}
