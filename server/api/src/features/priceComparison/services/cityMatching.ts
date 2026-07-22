/**
 * cityMatching.ts - נורמול/זיהוי שמות ערים וולידציה של תוצאות גיאוקודינג
 * מול מרכז העיר המבוקשת (מונע תוצאות "רחוקות" שגויות).
 */

import { FALLBACK_CITY_COORDS, CITY_ALIASES } from '../data/cityCoords.data';
import type { GeocodeResult } from './geocoderShared';

// זיהוי שדה city ממולא בזבל (מספר מיקוד, '0', '?', או ריק)
export const isJunkCity = (city: string | undefined): boolean => {
  if (!city) return true;
  const t = city.trim();
  if (t === '' || t === '?' || t === '-') return true;
  // מספר טהור = מיקוד או store ID שהוכנס בטעות לשדה עיר
  if (/^\d+$/.test(t)) return true;
  // קצר מדי - לא שם עיר אמיתי
  if (t.length < 2) return true;
  return false;
};

// חיפוש שם עיר מוכר בתוך טקסט (כתובת/שם סניף) - שימושי כשהשדה city
// מכיל זבל אבל הכתובת מציינת את העיר במפורש.
export const findKnownCityIn = (text: string | undefined): string | null => {
  if (!text) return null;
  // עוברים על שמות הערים מהארוך לקצר (כדי שתל אביב-יפו ייתפס לפני תל אביב)
  const cityNames = [...Object.keys(FALLBACK_CITY_COORDS), ...Object.keys(CITY_ALIASES)]
    .sort((a, b) => b.length - a.length);
  for (const name of cityNames) {
    if (text.includes(name)) return name;
  }
  return null;
};

const normalizeCity = (city: string | undefined): string => {
  if (!city) return '';
  const trimmed = city.trim();
  return CITY_ALIASES[trimmed] ?? trimmed;
};

function cityFallbackCoords(city: string | undefined): GeocodeResult | null {
  if (!city) return null;
  const normalized = normalizeCity(city);
  return FALLBACK_CITY_COORDS[normalized] ?? null;
}

// תוקן ל-script - מחזיר fallback גם כשהשדה city לא ידוע, ע"י חיפוש בכתובת
// או בשם הסניף. אם יש "עמק שרה" בכתובת אבל city="9000", נחזיר את מרכז
// באר שבע (עמק שרה). storeName חשוב במיוחד כי לעיתים זה הרמז היחיד
// ("רמי לוי עפולה" → עפולה).
export function cityFallbackFromAnyField(
  city: string | undefined,
  address: string | undefined,
  storeName?: string | undefined
): GeocodeResult | null {
  const direct = cityFallbackCoords(city);
  if (direct) return direct;
  const extracted = findKnownCityIn([address, storeName].filter(Boolean).join(' '));
  if (extracted) return cityFallbackCoords(extracted);
  return null;
}

// מרחק haversine בק"מ - שימוש לוולידציה שהתוצאה קרובה לעיר המבוקשת
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// אימות שהתוצאה אכן בעיר המבוקשת - תוצאה רחוקה מ-12 ק"מ ממרכז העיר
// כמעט בוודאות שגויה. רוב הערים בישראל ברדיוס של 5-8 ק"מ, ערים גדולות
// (ת"א, ירושלים) עד 10 ק"מ. סף של 12 נותן מרווח קטן בלי לאשר תוצאות
// בערים אחרות. בעבר היה 25 ואיפשר תוצאה במודיעין במקום במודיעין עילית.
const MAX_DIST_FROM_CITY_KM = 12;
export const validateNearCity = (
  result: GeocodeResult,
  city: string | undefined
): boolean => {
  const center = cityFallbackCoords(city);
  if (!center) return true; // אין נתון השוואה - מקבלים
  const dist = haversineKm(result.lat, result.lng, center.lat, center.lng);
  return dist <= MAX_DIST_FROM_CITY_KM;
};
