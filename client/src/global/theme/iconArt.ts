// ===== "אריחי גרדיאנט חיים" =====
// לוגיקה משותפת שהופכת hex שטוח (l.color / user.avatarColor, בדיוק כמו
// שנשמר ב-DB היום - שום שינוי פורמט) לגרדיאנט+glow עשיר, ו-seed
// דטרמיניסטי לבחירת וריאציית דפוס - כדי שאייקונים יראו "חיים" בלי
// לגעת בשרת בכלל. ראו IconTile.tsx (רשימות) ו-AvatarRing.tsx (אווטארים).

// מיפוי מכוון (לא ניחוש) - כל אחד מהצבעים הקיימים ב-LIST_COLORS/
// MEMBER_COLORS/AVATAR_COLORS (constants/index.ts, profile-types.ts)
// מקבל זוג stops [בהיר, כהה] מעוצב בעצמו. פאלבק אלגוריתמי (deriveStops)
// מכסה כל hex אחר שלא ברשימה. נשמר כזוג צבעים גולמי (לא מחרוזת
// gradient מוכנה) כדי ש-IconTile (linear-gradient) ו-AvatarRing
// (conic-gradient) יוכלו לבנות ממנו כל אחד את סוג ה-gradient שלו,
// בלי לפרסר מחרוזת CSS.
const STOPS_MAP: Record<string, [string, string]> = {
  '#14B8A6': ['#5EEAD4', '#0D9488'], // תורכיז
  '#8B5CF6': ['#C4B5FD', '#7C3AED'], // סגול
  '#EC4899': ['#F9A8D4', '#DB2777'], // ורוד
  '#EF4444': ['#FCA5A5', '#DC2626'], // אדום
  '#F59E0B': ['#FCD34D', '#D97706'], // ענבר
  '#10B981': ['#6EE7B7', '#059669'], // ירוק
  '#06B6D4': ['#67E8F9', '#0891B2'], // ציאן
};

const DEFAULT_HEX = '#14B8A6';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// שינוי בהירות פשוט (לא HSL מלא - מספיק לגזירת stop בהיר/כהה מ-hex לא-מוכר)
function shade(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  const mix = (c: number) => (amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return rgbToHex(mix(r), mix(g), mix(b));
}

// גזירת stops אלגוריתמית ל-hex שלא ברשימה המעוצבת - שומר על אותו hex
// כ-stop הכהה (זהות הצבע שהמשתמש בחר נשמרת), עם stop בהיר משלים.
function deriveStops(hex: string): [string, string] {
  return [shade(hex, 0.35), hex];
}

// זוג הצבעים הגולמי מאחורי הגרדיאנט - המקור האמיתי היחיד. getIconGradient/
// getIconGlow שניהם בנויים מעליו, לא מגדירים צבעים משלהם.
export function getIconStops(hex: string | undefined | null): [string, string] {
  const key = (hex || DEFAULT_HEX).toUpperCase();
  const found = Object.keys(STOPS_MAP).find(k => k.toUpperCase() === key);
  if (found) return STOPS_MAP[found];
  if (hexToRgb(hex || '')) return deriveStops(hex!);
  return STOPS_MAP[DEFAULT_HEX];
}

export function getIconGradient(hex: string | undefined | null): string {
  const [light, dark] = getIconStops(hex);
  return `linear-gradient(135deg, ${light} 0%, ${dark} 100%)`;
}

// glow + זכוכית: צל רך בגוון הגרדיאנט מסביב + highlight פנימי עדין
// למעלה (inset לבן) ועומק קל למטה (inset כהה) - "עדשה" לא ריבוע שטוח.
export function getIconGlow(hex: string | undefined | null): string {
  const [, dark] = getIconStops(hex);
  const rgb = hexToRgb(dark) ?? [13, 148, 136];
  const [r, g, b] = rgb;
  return [
    `0 6px 16px rgba(${r},${g},${b},0.38)`,
    'inset 0 1px 1.5px rgba(255,255,255,0.45)',
    'inset 0 -3px 5px rgba(0,0,0,0.12)',
  ].join(', ');
}

// hash דטרמיניסטי קצר (djb2) - לבחירת וריאציית דפוס לפי מזהה יציב
// (list.id / user.id), לא רנדומלי (אותה רשימה תמיד מקבלת אותה וריאציה).
export function hashSeed(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// "סקוויקל" מעודן ואחיד (לא blob אקראי - נשאר קריא בגריד צפוף) - מעוגל
// יותר מריבוע רגיל, פחות "טיפה" מעיגול, זהות צורנית מיידית לרשימות.
export const SQUIRCLE_RADIUS = '28%';
