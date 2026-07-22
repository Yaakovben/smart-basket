/**
 * geocoder.service.ts - Public API של הגיאוקודינג (Nominatim/LocationIQ).
 * המימוש בפועל מפוצל: geocoderShared (קבועים/rate-limit), cityMatching
 * (fallback לפי שם עיר), forwardGeocoder (כתובת→קואורדינטות),
 * reverseGeocoder (קואורדינטות→כתובת).
 */

export type { GeocodeResult } from './geocoderShared';
export { cityFallbackFromAnyField } from './cityMatching';
export { geocodeAddress } from './forwardGeocoder';
export { reverseGeocode, type ReverseGeocodeResult } from './reverseGeocoder';
