/**
 * כתובות סניפים מהאתר הרשמי של הרשת, לסניפים שבקובץ הסניפים של פורטל השקיפות אין
 * להם כתובת שמישה. סופר ספיר מפרסמת "unknown" כמעט לכל סניפי נטו חיסכון, ולכן אי אפשר
 * היה למקם אותם, והם לא הופיעו ב"קרוב אליך".
 *
 * מקור: https://nettochisachon.com/סניפים/ (האתר של נטו חיסכון, קבוצת ספיר), נבדק
 * ב-29.9.2026. השיוך לסניף בפורטל (storeId, מזהה אחיד בלי אפסים מובילים) לפי אותו
 * יישוב ואותו שם, רק כשהוא חד-משמעי. "אלעד - שמעיה" לא שויך: בפורטל שני סניפים באלעד,
 * ולא ברור איזה מהם הוא.
 */
export interface OfficialBranchAddress {
  chainId: string;
  storeId: string;
  // שם הסניף באתר הרשת, לתיעוד
  siteName: string;
  address: string;
  city: string;
}

export const OFFICIAL_ADDRESSES_SOURCE = 'https://nettochisachon.com/סניפים/';
export const OFFICIAL_ADDRESSES_VERIFIED_AT = '2026-09-29';

export const OFFICIAL_BRANCH_ADDRESSES: OfficialBranchAddress[] = [
  { chainId: 'super_sapir', storeId: '40', siteName: 'ביתר עלית', address: 'שלום שבזי 16', city: 'ביתר עילית' },
  { chainId: 'super_sapir', storeId: '51', siteName: 'מודיעין עלית', address: 'רש"י פינת רמב"ן', city: 'מודיעין עילית' },
  { chainId: 'super_sapir', storeId: '82', siteName: 'מודיעין עלית-יחזקאל', address: 'יחזקאל 2', city: 'מודיעין עילית' },
  { chainId: 'super_sapir', storeId: '275', siteName: 'בית שמש', address: 'הרב ישראל גרוסמן 66', city: 'בית שמש' },
  { chainId: 'super_sapir', storeId: '52', siteName: 'טלזסטון', address: 'שביל התאנה 2', city: 'קרית יערים' },
  { chainId: 'super_sapir', storeId: '54', siteName: 'ירושלים - רמות', address: 'כיסופים 801', city: 'ירושלים' },
  { chainId: 'super_sapir', storeId: '83', siteName: 'אלעד - מרכז רימון', address: 'שמעון בן שטח 10', city: 'אלעד' },
  { chainId: 'super_sapir', storeId: '84', siteName: 'בת ים', address: 'ישראל וישנגרד 12', city: 'בת ים' },
  { chainId: 'super_sapir', storeId: '194', siteName: 'נתניה', address: 'הפלדה 13', city: 'נתניה' },
  { chainId: 'super_sapir', storeId: '94', siteName: 'צפת', address: 'דרך השוקולד 8', city: 'צפת' },
  { chainId: 'super_sapir', storeId: '192', siteName: 'חדרה', address: 'דוד אלעזר 27', city: 'חדרה' },
  { chainId: 'super_sapir', storeId: '193', siteName: 'קרית אתא', address: 'העצמאות 42', city: 'קרית אתא' },
  { chainId: 'super_sapir', storeId: '43', siteName: 'מעלות', address: 'החרושת 8', city: 'מעלות-תרשיחא' },
  { chainId: 'super_sapir', storeId: '22', siteName: 'קרית שמונה', address: 'יהלום 8', city: 'קרית שמונה' },
  { chainId: 'super_sapir', storeId: '53', siteName: 'עפולה', address: 'יוסף ברזילאי 5', city: 'עפולה' },
  { chainId: 'super_sapir', storeId: '85', siteName: 'באר שבע', address: 'ברוך קטינקא 2', city: 'באר שבע' },
  { chainId: 'super_sapir', storeId: '197', siteName: 'אשדוד', address: 'האורגים 21', city: 'אשדוד' },
];
