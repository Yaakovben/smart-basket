/**
 * geocoderShared.ts - קבועים, טיפוסים ו-rate limiting משותפים לגיאוקודינג
 * (forward: כתובת→קואורדינטות, reverse: קואורדינטות→כתובת) מול Nominatim/LocationIQ.
 */

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
export const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
export const LOCATIONIQ_URL = 'https://eu1.locationiq.com/v1/search';
export const LOCATIONIQ_REVERSE_URL = 'https://eu1.locationiq.com/v1/reverse';
export const USER_AGENT = 'smart-basket-branches/1.0 (price-comparison feature)';

const NOMINATIM_MIN_DELAY_MS = 1100; // 1 בקשה/שנייה אצל Nominatim
const LOCATIONIQ_MIN_DELAY_MS = 550;  // 2 בקשות/שנייה במסלול החינמי

let nominatimLastRequestAt = 0;
let locationiqLastRequestAt = 0;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ממתין עד שעבר מספיק זמן מהבקשה הקודמת ל-Nominatim, ומעדכן את חותמת הזמן.
export async function waitForNominatimSlot(): Promise<void> {
  const since = Date.now() - nominatimLastRequestAt;
  if (since < NOMINATIM_MIN_DELAY_MS) await sleep(NOMINATIM_MIN_DELAY_MS - since);
  nominatimLastRequestAt = Date.now();
}

// ממתין עד שעבר מספיק זמן מהבקשה הקודמת ל-LocationIQ, ומעדכן את חותמת הזמן.
export async function waitForLocationIQSlot(): Promise<void> {
  const since = Date.now() - locationiqLastRequestAt;
  if (since < LOCATIONIQ_MIN_DELAY_MS) await sleep(LOCATIONIQ_MIN_DELAY_MS - since);
  locationiqLastRequestAt = Date.now();
}

export interface GeocodeResult {
  lat: number;
  lng: number;
}

// בדיקה שהקואורדינטות בתוך גבולות ישראל (כולל יו"ש ורמת הגולן) -
// מסנן תוצאות שגויות שמחזירות נקודה אקראית בעולם.
export const inIsraelBounds = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lng)
  && lat >= 29 && lat <= 34
  && lng >= 33 && lng <= 36;
