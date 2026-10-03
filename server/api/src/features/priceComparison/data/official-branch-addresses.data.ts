/**
 * כתובות סניפים (ולפעמים גם מיקום) מהאתר הרשמי של הרשת, לסניפים שבקובץ הסניפים של
 * פורטל השקיפות אין להם כתובת שמישה.
 *
 * נטו חיסכון: סופר ספיר מפרסמת "unknown" כמעט לכל סניפי נטו חיסכון, ולכן אי אפשר
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
  // בלי עיר: העיר מקובץ הסניפים נשארת (כשהאתר לא מציין עיר)
  city?: string;
  // מיקום רשמי מהאתר (מפת הסניף שבאתר הרשת)
  lat?: number;
  lng?: number;
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
  // יוחננוף: https://yochananof.co.il/branches, נבדק ב-30.9.2026. רשימת הסניפים
  // מוטמעת בקוד האתר, עם כתובת ומפה (הקואורדינטות מתוך קישור המפה). בקובץ הסניפים של
  // הפורטל לרוב הסניפים הכתובת "unknown" והעיר שגויה ("יהוד" לאור עקיבא ולמישור
  // אדומים). מספר הסניף באתר זהה לפורטל, חוץ מאיירפורט סיטי (33 בפורטל, 133 באתר);
  // כל שיוך אומת גם לפי השם. לא שויכו: "יוחננוף ישן", רמלה, סגולה, חדרה צפוני ונקודות
  // האיסוף, שאין להם סניף באתר.
  { chainId: 'yohananof', storeId: '1', siteName: "רחובות – מפוח", address: "המפוח 11, א.ת רחובות", city: 'רחובות', lat: 31.886541, lng: 34.780207 },
  { chainId: 'yohananof', storeId: '4', siteName: "צומת בילו", address: "צומת בילו", lat: 31.870139, lng: 34.82163 },
  { chainId: 'yohananof', storeId: '5', siteName: "אשדוד – סטאר סנטר", address: "ז'בוטינסקי 27, סטאר סנטר אשדוד", city: 'אשדוד', lat: 31.811245, lng: 34.654081 },
  { chainId: 'yohananof', storeId: '7', siteName: "קריית עקרון", address: "המלך חסן 1, קרית עקרון", city: 'קרית עקרון', lat: 31.860194, lng: 34.814538 },
  { chainId: 'yohananof', storeId: '8', siteName: "רחובות – אחד העם", address: "אחד העם 19, רחובות", city: 'רחובות', lat: 31.898125, lng: 34.8116 },
  { chainId: 'yohananof', storeId: '9', siteName: "נתיבות", address: "בעלי המלאכה 2, א.ת נתיבות", city: 'נתיבות', lat: 31.41829, lng: 34.597349 },
  { chainId: 'yohananof', storeId: '13', siteName: "חיפה – חוצות המפרץ", address: "החרושת 10, חוצות המפרץ, חיפה", city: 'חיפה', lat: 32.810707, lng: 35.05681 },
  { chainId: 'yohananof', storeId: '15', siteName: "אור יהודה – הפלדה (קטן)", address: "הפלדה 1, אור יהודה", city: 'אור יהודה', lat: 32.032758, lng: 34.850994 },
  { chainId: 'yohananof', storeId: '16', siteName: "גן יבנה", address: "המגינים 56, גן יבנה", city: 'גן יבנה', lat: 31.794036, lng: 34.706737 },
  { chainId: 'yohananof', storeId: '17', siteName: "מודיעין – ישפרו", address: "שדרות המלאכות, ישפרו סנטר, מודיעין", city: 'מודיעין-מכבים-רעות', lat: 31.889801, lng: 34.962811 },
  { chainId: 'yohananof', storeId: '18', siteName: "מודיעין – כרמים", address: "תשרי 34, מודיעין", city: 'מודיעין-מכבים-רעות', lat: 31.916163, lng: 35.009964 },
  { chainId: 'yohananof', storeId: '19', siteName: "אור יהודה – רחוב המפעל", address: "המפעל 2, א.ת ישן, אור יהודה", city: 'אור יהודה', lat: 32.034276, lng: 34.84941 },
  { chainId: 'yohananof', storeId: '20', siteName: "ירושלים – תלפיות", address: "האומן 10 (תלפיות), ירושלים", city: 'ירושלים', lat: 31.748876, lng: 35.211105 },
  { chainId: 'yohananof', storeId: '22', siteName: "חדרה – וילג'", address: "פרופסור דן שכטמן 10, חדרה", city: 'חדרה', lat: 32.441677, lng: 34.895065 },
  { chainId: 'yohananof', storeId: '23', siteName: "טבריה – פוריה", address: "החרושת, אזור תעשיה פוריה, טבריה", city: 'טבריה', lat: 32.778531, lng: 35.501394 },
  { chainId: 'yohananof', storeId: '24', siteName: "כפר סבא – עתיר ידע", address: "עתיר ידע 1, כפר סבא", city: 'כפר סבא', lat: 32.166473, lng: 34.928285 },
  { chainId: 'yohananof', storeId: '25', siteName: "נס ציונה", address: "האירוסים 32 (מול חניון הקניות), נס ציונה", city: 'נס ציונה', lat: 31.930727, lng: 34.797812 },
  { chainId: 'yohananof', storeId: '26', siteName: "רמת השרון – מורשה", address: "החרושת 10, רמת השרון", city: 'רמת השרון', lat: 32.128338, lng: 34.859027 },
  { chainId: 'yohananof', storeId: '27', siteName: "תל אביב – יד אליהו", address: "יגאל אלון 57, תל אביב", city: 'תל אביב-יפו', lat: 32.063392, lng: 34.791997 },
  { chainId: 'yohananof', storeId: '28', siteName: "ראשון לציון – רמת אליהו", address: "משורר השואה 15, ראשון לציון", city: 'ראשון לציון', lat: 31.982866, lng: 34.792362 },
  { chainId: 'yohananof', storeId: '29', siteName: "בת ים – ניסנבאום", address: "ניסנבאום 34 פינת החרושת, בת ים", city: 'בת ים', lat: 32.008992, lng: 34.750669 },
  { chainId: 'yohananof', storeId: '30', siteName: "נתניה – צורן", address: "הצורן 2, נתניה", city: 'נתניה', lat: 32.287131, lng: 34.866553 },
  { chainId: 'yohananof', storeId: '31', siteName: "רחובות – סנטרו", address: "מוטי קינד 10, מרכז סנטרו, רחובות", city: 'רחובות', lat: 31.894687, lng: 34.791616 },
  { chainId: 'yohananof', storeId: '32', siteName: "תל אביב – בן צבי", address: "דרך בן צבי 112, תל אביב", city: 'תל אביב-יפו', lat: 32.039, lng: 34.775502 },
  { chainId: 'yohananof', storeId: '33', siteName: "איירפורט סיטי", address: "שרון 1, קריית שדה התעופה", lat: 31.986061, lng: 34.914587 },
  { chainId: 'yohananof', storeId: '34', siteName: "אשקלון – מבקיעים", address: "מתחם גלובוס סנטר אשקלון / מבקיעים", city: 'אשקלון', lat: 31.626959, lng: 34.583674 },
  { chainId: 'yohananof', storeId: '35', siteName: "תל אביב – נחלת יצחק", address: "נחלת יצחק 20, מגדלי תל אביב", city: 'תל אביב-יפו', lat: 32.074128, lng: 34.800071 },
  { chainId: 'yohananof', storeId: '37', siteName: "עפולה – קהילת ציון", address: "קהילת ציון 30, עפולה", city: 'עפולה', lat: 32.606595, lng: 35.297422 },
  { chainId: 'yohananof', storeId: '38', siteName: "טבריה – מתחם דנילוף", address: "יהודה הלוי 113, מתחם דנילוף סנטר, טבריה", city: 'טבריה', lat: 32.790868, lng: 35.531802 },
  { chainId: 'yohananof', storeId: '39', siteName: "קריית שמונה", address: "תל חי 93, קרית שמונה", city: 'קרית שמונה', lat: 33.197102, lng: 35.569494 },
  { chainId: 'yohananof', storeId: '40', siteName: "באר שבע – דיזיין פלוס", address: "אליהו נאווי 12, דיזיין פלוס, באר שבע", city: 'באר שבע', lat: 31.244246, lng: 34.806349 },
  { chainId: 'yohananof', storeId: '41', siteName: "אשקלון – ברנע", address: "אריה תגר 45, אשקלון", city: 'אשקלון', lat: 31.702035, lng: 34.57714 },
  { chainId: 'yohananof', storeId: '42', siteName: "ראשון לציון – קניון הבאר", address: "מורשת ישראל 15, קניון הבאר, ראשון לציון", city: 'ראשון לציון', lat: 31.975656, lng: 34.776443 },
  { chainId: 'yohananof', storeId: '46', siteName: "מישור אדומים", address: "חרובית 38, מישור אדומים", city: 'מישור אדומים', lat: 31.78747, lng: 35.340491 },
  { chainId: 'yohananof', storeId: '48', siteName: "אשדות יעקב – פארק אדיסון", address: "מתחם פארק אדיסון, אשדות יעקב", city: 'אשדות יעקב', lat: 32.661897, lng: 35.574598 },
  { chainId: 'yohananof', storeId: '50', siteName: "נתניה – ביקל", address: "האורזים 2, ביקל אאוטלט סנטר (קניון הדרים לשעבר), נתניה", city: 'נתניה', lat: 32.322967, lng: 34.87466 },
  { chainId: 'yohananof', storeId: '51', siteName: "שדרות", address: "קופנהגן 3, שדרות", city: 'שדרות', lat: 31.523721, lng: 34.608904 },
  { chainId: 'yohananof', storeId: '52', siteName: "גדרה", address: "אברהם דורון 1, מתחם ביג, גדרה", city: 'גדרה', lat: 31.798883, lng: 34.769539 },
  { chainId: 'yohananof', storeId: '53', siteName: "רעננה", address: "סשה ארגוב 23, נווה זמר, רעננה", city: 'רעננה', lat: 32.193267, lng: 34.865714 },
  { chainId: 'yohananof', storeId: '54', siteName: "תל אביב – בית פסגות", address: "אחד העם 14, תל אביב", city: 'תל אביב-יפו', lat: 32.063498, lng: 34.769442 },
  { chainId: 'yohananof', storeId: '55', siteName: "יוחננוף מהדרין – נתיבות", address: "מנהטן סנטר, אליהו אילוז 2, נתיבות", city: 'נתיבות', lat: 31.412173, lng: 34.574991 },
  { chainId: 'yohananof', storeId: '59', siteName: "אור עקיבא – השיקמים", address: "השיקמים 8, אור עקיבא", city: 'אור עקיבא', lat: 32.504443, lng: 34.91805 },
  { chainId: 'yohananof', storeId: '60', siteName: "בית שאן", address: "שדרות מנחם בגין 1, בית שאן", city: 'בית שאן', lat: 32.498675, lng: 35.506551 },
  { chainId: 'yohananof', storeId: '73', siteName: "חולון - המרכבה", address: "המרכבה 9, חולון", city: 'חולון', lat: 32.017275, lng: 34.807389 },
  // רמי לוי שער בנימין: בפורטל בלי מיקום, ובמקומו הוצג עותק מ-OpenStreetMap ("רמי לוי
  // שיווק השקמה") עם מחיר רשת בלבד ועיר שגויה ("ג'בע בדואים"). המיקום מנקודת החנות
  // ב-OpenStreetMap (way 506265677), שאליה הוביל הניווט לסניף, כפי שאומת במקום ב-3.10.2026.
  // הכתובת כפי שבפורטל.
  { chainId: 'rami_levy', storeId: '8', siteName: 'רמי לוי שיווק השקמה (שער בנימין)', address: 'מרכז מסחרי מטה בנמין', lat: 31.865587, lng: 35.260301 },
];
