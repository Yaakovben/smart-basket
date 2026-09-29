/**
 * cityMatching.ts - נורמול/זיהוי שמות ערים וולידציה של תוצאות גיאוקודינג
 * מול מרכז העיר המבוקשת (מונע תוצאות "רחוקות" שגויות).
 */

import { FALLBACK_CITY_COORDS, CITY_ALIASES } from '../data/cityCoords.data';
import { CBS_LOCALITY_NAMES } from '../data/cbsLocalities.data';
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

// האם קואורדינטות של סניף סותרות את העיר ששם הסניף מציין. באושר עד, למשל, שם
// הסניף הוא העיר ("בית שמש - גליל", "קרית ים"), והגיאוקודינג שם אותם ברמת גן
// ובגבעת שמואל. סניף כזה מוצג "קרוב אליך" במרחק שגוי, ולכן לא נסמכים על המיקום
// שלו. שם בלי עיר מוכרת = אין סתירה.
export const coordsConflictWithName = (lat: number, lng: number, storeName: string | undefined): boolean => {
  const cities = findKnownCitiesAsWords(storeName);
  if (cities.length === 0) return false;
  // שם שמזכיר כמה ערים ("בני ברק- ירושלים", כשירושלים היא הרחוב): מספיק שהמיקום ליד אחת
  return !cities.some(city => validateNearCity({ lat, lng }, city));
};

// הנקודה שהגיאוקודר מחזיר לשאילתה שלא נמצאה ("ישראל"). נמצאה במאגר אצל 22 סניפים
// מערים שונות (אופקים, בת ים, ראש פינה...), כלומר זה לא מיקום של סניף.
const COUNTRY_CENTROID = { lat: 30.8952, lng: 34.8752 };
export const isCountryCentroid = (lat: number, lng: number): boolean =>
  haversineKm(lat, lng, COUNTRY_CENTROID.lat, COUNTRY_CENTROID.lng) < 1;

// "מועצה אזורית רמת נגב" ודומיו: שדה עיר שהושלם בעבר מחיפוש הפוך של מיקום שגוי
// (נקודת ברירת המחדל של הגיאוקודר נמצאת במועצה הזו). לא עיר של סניף.
export const isArtifactCity = (city: string | undefined): boolean => !!city && /^מועצה אזורית/.test(city.trim());

// שמות כל היישובים לפי הרשימה הרשמית, מהארוך לקצר
const CBS_NAMES = [...new Set(Object.values(CBS_LOCALITY_NAMES))].sort((a, b) => b.length - a.length);
const normalizeForMatch = (s: string) => s.replace(/[\s\-־]+/g, ' ').trim();

// שם הסניף הוא בדיוק שם של יישוב ("עכו", "כפר סבא"): כך אושר עד ורמי לוי קוראות לסניפים
export function exactCityFromStoreName(storeName: string | undefined): string | null {
  if (!storeName) return null;
  const name = normalizeForMatch(storeName);
  for (const c of [...Object.keys(FALLBACK_CITY_COORDS), ...CBS_NAMES]) {
    if (normalizeForMatch(c) === name) return CITY_ALIASES[c] ?? c;
  }
  return null;
}

// יישוב מהרשימה הרשמית שמופיע בטקסט כמילה שלמה (גם יישובים קטנים שאין בטבלת הערים)
export function findCbsLocalityIn(text: string | undefined): string | null {
  if (!text) return null;
  for (const name of CBS_NAMES) {
    if (AMBIGUOUS_CITY_WORDS.has(name) || name.length < 3) continue;
    const i = text.indexOf(name);
    if (i === -1) continue;
    const before = i > 0 ? text[i - 1] : '';
    const after = text[i + name.length] ?? '';
    if (!HEBREW_LETTER.test(before) && !HEBREW_LETTER.test(after)) return name;
  }
  return null;
}

// שמות ערים שהם גם שמות רחובות נפוצים ("שדרות האמוראים", "עלי הכהן")
const AMBIGUOUS_CITY_WORDS = new Set(['שדרות', 'עלי']);
const HEBREW_LETTER = /[א-ת]/;

// כל שמות הערים המוכרים שמופיעים בטקסט כמילה שלמה, ולא כחלק ממילה
// ("יהוד" בתוך "בן יהודה", "נשר" בתוך "כנפי נשרים")
export const findKnownCitiesAsWords = (text: string | undefined): string[] => {
  if (!text) return [];
  const found: string[] = [];
  const names = [...Object.keys(FALLBACK_CITY_COORDS), ...Object.keys(CITY_ALIASES)].sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (AMBIGUOUS_CITY_WORDS.has(name)) continue;
    let from = 0;
    for (let i = text.indexOf(name, from); i !== -1; i = text.indexOf(name, from)) {
      const before = i > 0 ? text[i - 1] : '';
      const after = text[i + name.length] ?? '';
      if (!HEBREW_LETTER.test(before) && !HEBREW_LETTER.test(after)) {
        found.push(name);
        break;
      }
      from = i + 1;
    }
  }
  return found;
};

export const validateNearCity = (
  result: GeocodeResult,
  city: string | undefined
): boolean => {
  const center = cityFallbackCoords(city);
  if (!center) return true; // אין נתון השוואה - מקבלים
  const dist = haversineKm(result.lat, result.lng, center.lat, center.lng);
  return dist <= MAX_DIST_FROM_CITY_KM;
};
