/**
 * known-branches.data.ts
 *
 * רשימת סניפי סופרים מובילים בישראל עם קואורדינטות אמיתיות.
 * הנתונים נאספו מכתובות ציבוריות של סניפים מרכזיים (קניונים, רחובות
 * ידועים, אזורי מסחר) - כתובות שניתן לאמת בקלות.
 *
 * זה ה-fallback שמובטח להיות זמין: גם אם OSM לא מגיב והפורטל הממשלתי
 * לא מפרסם, יש לנו ~50 סניפים אמיתיים פעילים מיד אחרי deploy.
 *
 * הקואורדינטות הן של הכתובות (קניון/רחוב) - דיוק של ~50-200 מטר,
 * מספיק טוב להציג את הסניף הקרוב למשתמש.
 */

import type { ChainId } from '../models/Price.model';

export interface KnownBranch {
  chainId: ChainId;
  storeId: string;
  storeName: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
}

export const KNOWN_BRANCHES: KnownBranch[] = [
  // ============ שופרסל - הרשת הגדולה ביותר ============
  // גוש דן
  { chainId: 'shufersal', storeId: 'sf-tlv-dizengoff', storeName: 'שופרסל דיל דיזנגוף סנטר', city: 'תל אביב', address: 'דיזנגוף 50, דיזנגוף סנטר', lat: 32.0784, lng: 34.7741 },
  { chainId: 'shufersal', storeId: 'sf-tlv-ibn-gvirol', storeName: 'שופרסל שלי איבן גבירול', city: 'תל אביב', address: 'איבן גבירול 70', lat: 32.0853, lng: 34.7818 },
  { chainId: 'shufersal', storeId: 'sf-tlv-ramat-aviv', storeName: 'שופרסל דיל קניון רמת אביב', city: 'תל אביב', address: 'איינשטיין 40, קניון רמת אביב', lat: 32.1144, lng: 34.7905 },
  { chainId: 'shufersal', storeId: 'sf-tlv-port', storeName: 'שופרסל שלי נמל תל אביב', city: 'תל אביב', address: 'הנמל 24', lat: 32.0992, lng: 34.7720 },
  { chainId: 'shufersal', storeId: 'sf-rg-ayalon', storeName: 'שופרסל דיל קניון איילון', city: 'רמת גן', address: 'אבא הלל סילבר 95', lat: 32.0692, lng: 34.8253 },
  { chainId: 'shufersal', storeId: 'sf-rg-bialik', storeName: 'שופרסל שלי רמת גן', city: 'רמת גן', address: 'ביאליק 58', lat: 32.0712, lng: 34.8245 },
  { chainId: 'shufersal', storeId: 'sf-givataim', storeName: 'שופרסל דיל גבעתיים', city: 'גבעתיים', address: 'ויצמן 32', lat: 32.0712, lng: 34.8103 },
  { chainId: 'shufersal', storeId: 'sf-holon', storeName: 'שופרסל דיל חולון', city: 'חולון', address: 'סוקולוב 62', lat: 32.0117, lng: 34.7731 },
  { chainId: 'shufersal', storeId: 'sf-batyam', storeName: 'שופרסל שלי בת ים', city: 'בת ים', address: 'הרצל 40', lat: 32.0221, lng: 34.7456 },
  { chainId: 'shufersal', storeId: 'sf-bb', storeName: 'שופרסל בני ברק', city: 'בני ברק', address: 'ז\'בוטינסקי 59', lat: 32.0858, lng: 34.8330 },
  { chainId: 'shufersal', storeId: 'sf-pt', storeName: 'שופרסל שלי פתח תקווה', city: 'פתח תקווה', address: 'חיים עוזר 47', lat: 32.0881, lng: 34.8858 },

  // השרון
  { chainId: 'shufersal', storeId: 'sf-herz', storeName: 'שופרסל שלי הרצליה', city: 'הרצליה', address: 'סוקולוב 34', lat: 32.1638, lng: 34.8432 },
  { chainId: 'shufersal', storeId: 'sf-kfar-saba', storeName: 'שופרסל דיל כפר סבא', city: 'כפר סבא', address: 'ויצמן 150', lat: 32.1781, lng: 34.9100 },
  { chainId: 'shufersal', storeId: 'sf-raanana', storeName: 'שופרסל שלי רעננה', city: 'רעננה', address: 'אחוזה 100', lat: 32.1848, lng: 34.8718 },
  { chainId: 'shufersal', storeId: 'sf-netanya', storeName: 'שופרסל דיל נתניה', city: 'נתניה', address: 'הרצל 9', lat: 32.3323, lng: 34.8554 },

  // מרכז
  { chainId: 'shufersal', storeId: 'sf-rishon', storeName: 'שופרסל דיל ראשון לציון', city: 'ראשון לציון', address: 'רוטשילד 60', lat: 31.9647, lng: 34.8044 },
  { chainId: 'shufersal', storeId: 'sf-rehovot', storeName: 'שופרסל דיל רחובות', city: 'רחובות', address: 'הרצל 189', lat: 31.8946, lng: 34.8108 },
  { chainId: 'shufersal', storeId: 'sf-modiin', storeName: 'שופרסל דיל מודיעין', city: 'מודיעין', address: 'עמק דותן', lat: 31.8980, lng: 35.0120 },
  { chainId: 'shufersal', storeId: 'sf-ramla', storeName: 'שופרסל שלי רמלה', city: 'רמלה', address: 'הרצל 121', lat: 31.9272, lng: 34.8667 },

  // ירושלים
  { chainId: 'shufersal', storeId: 'sf-jlm-malha', storeName: 'שופרסל קניון מלחה', city: 'ירושלים', address: 'אגודת ספורט הפועל 1, קניון מלחה', lat: 31.7491, lng: 35.1881 },
  { chainId: 'shufersal', storeId: 'sf-jlm-talpiot', storeName: 'שופרסל שלי תלפיות', city: 'ירושלים', address: 'פייר קניג 13', lat: 31.7485, lng: 35.2245 },

  // צפון
  { chainId: 'shufersal', storeId: 'sf-hf-grand', storeName: 'שופרסל גרנד קניון חיפה', city: 'חיפה', address: 'ההסתדרות 256', lat: 32.8089, lng: 35.0251 },
  { chainId: 'shufersal', storeId: 'sf-hf-leev', storeName: 'שופרסל דיל לב המפרץ', city: 'חיפה', address: 'דרך בר יהודה', lat: 32.8345, lng: 35.0843 },
  { chainId: 'shufersal', storeId: 'sf-hadera', storeName: 'שופרסל דיל חדרה', city: 'חדרה', address: 'הרברט סמואל', lat: 32.4395, lng: 34.9182 },
  { chainId: 'shufersal', storeId: 'sf-nahariya', storeName: 'שופרסל דיל נהריה', city: 'נהריה', address: 'הגעתון 50', lat: 33.0086, lng: 35.0983 },

  // דרום
  { chainId: 'shufersal', storeId: 'sf-bs', storeName: 'שופרסל דיל באר שבע', city: 'באר שבע', address: 'יצחק רגר 1', lat: 31.2498, lng: 34.7920 },
  { chainId: 'shufersal', storeId: 'sf-ashdod', storeName: 'שופרסל דיל אשדוד', city: 'אשדוד', address: 'רוגוזין 51', lat: 31.7897, lng: 34.6461 },
  { chainId: 'shufersal', storeId: 'sf-ashkelon', storeName: 'שופרסל דיל אשקלון', city: 'אשקלון', address: 'בן גוריון 4', lat: 31.6688, lng: 34.5743 },
  { chainId: 'shufersal', storeId: 'sf-eilat', storeName: 'שופרסל דיל אילת', city: 'אילת', address: 'התמרים', lat: 29.5574, lng: 34.9490 },

  // ============ רמי לוי ============
  { chainId: 'rami_levy', storeId: 'rl-jlm-givat-shaul', storeName: 'רמי לוי גבעת שאול', city: 'ירושלים', address: 'הפסגה 49', lat: 31.7902, lng: 35.1908 },
  { chainId: 'rami_levy', storeId: 'rl-jlm-talpiot', storeName: 'רמי לוי תלפיות', city: 'ירושלים', address: 'יד חרוצים 12', lat: 31.7476, lng: 35.2321 },
  { chainId: 'rami_levy', storeId: 'rl-modiin', storeName: 'רמי לוי מודיעין', city: 'מודיעין', address: 'יצחק רבין 1', lat: 31.8988, lng: 35.0078 },
  { chainId: 'rami_levy', storeId: 'rl-bs', storeName: 'רמי לוי באר שבע', city: 'באר שבע', address: 'דרך חברון 50', lat: 31.2465, lng: 34.8045 },
  { chainId: 'rami_levy', storeId: 'rl-rishon', storeName: 'רמי לוי ראשון לציון', city: 'ראשון לציון', address: 'משה דיין 1', lat: 31.9801, lng: 34.7851 },
  { chainId: 'rami_levy', storeId: 'rl-ashdod', storeName: 'רמי לוי אשדוד', city: 'אשדוד', address: 'הגדוד העברי', lat: 31.7921, lng: 34.6521 },
  { chainId: 'rami_levy', storeId: 'rl-tlv', storeName: 'רמי לוי תל אביב', city: 'תל אביב', address: 'לוינסקי 108', lat: 32.0545, lng: 34.7793 },
  { chainId: 'rami_levy', storeId: 'rl-bb', storeName: 'רמי לוי בני ברק', city: 'בני ברק', address: 'ז\'בוטינסקי 170', lat: 32.0840, lng: 34.8336 },
  { chainId: 'rami_levy', storeId: 'rl-bs2', storeName: 'רמי לוי בית שמש', city: 'בית שמש', address: 'יגאל אלון', lat: 31.7496, lng: 34.9991 },
  { chainId: 'rami_levy', storeId: 'rl-hadera', storeName: 'רמי לוי חדרה', city: 'חדרה', address: 'דפנה 11', lat: 32.4390, lng: 34.9218 },
  { chainId: 'rami_levy', storeId: 'rl-hf', storeName: 'רמי לוי חיפה', city: 'חיפה', address: 'פלימן 15', lat: 32.7940, lng: 35.0100 },
  { chainId: 'rami_levy', storeId: 'rl-shaar-binyamin', storeName: 'רמי לוי שער בנימין', city: 'שער בנימין', address: 'אזור התעשייה שער בנימין', lat: 31.8773, lng: 35.2623 },

  // ============ יוחננוף ============
  { chainId: 'yohananof', storeId: 'yh-tlv-yigal-alon', storeName: 'יוחננוף תל אביב יגאל אלון', city: 'תל אביב', address: 'יגאל אלון 76', lat: 32.0712, lng: 34.7930 },
  { chainId: 'yohananof', storeId: 'yh-holon', storeName: 'יוחננוף חולון', city: 'חולון', address: 'הרצל 110', lat: 32.0098, lng: 34.7765 },
  { chainId: 'yohananof', storeId: 'yh-rishon', storeName: 'יוחננוף ראשון לציון', city: 'ראשון לציון', address: 'הרצל 120', lat: 31.9599, lng: 34.8012 },
  { chainId: 'yohananof', storeId: 'yh-pt', storeName: 'יוחננוף פתח תקווה', city: 'פתח תקווה', address: 'ז\'בוטינסקי 90', lat: 32.0884, lng: 34.8778 },
  { chainId: 'yohananof', storeId: 'yh-rehovot', storeName: 'יוחננוף רחובות', city: 'רחובות', address: 'בנימין 21', lat: 31.8934, lng: 34.8085 },
  { chainId: 'yohananof', storeId: 'yh-bs', storeName: 'יוחננוף באר שבע', city: 'באר שבע', address: 'שדרות בן גוריון 8', lat: 31.2518, lng: 34.7913 },
  { chainId: 'yohananof', storeId: 'yh-ashdod', storeName: 'יוחננוף אשדוד', city: 'אשדוד', address: 'מנחם בגין 2', lat: 31.8005, lng: 34.6538 },

  // ============ אושר עד (חרדי) ============
  { chainId: 'osher_ad', storeId: 'oa-bb-rabbi-akiva', storeName: 'אושר עד בני ברק רבי עקיבא', city: 'בני ברק', address: 'רבי עקיבא 15', lat: 32.0838, lng: 34.8355 },
  { chainId: 'osher_ad', storeId: 'oa-modiin-illit', storeName: 'אושר עד מודיעין עילית', city: 'מודיעין עילית', address: 'נתיבות המשפט 30', lat: 31.9336, lng: 35.0421 },
  { chainId: 'osher_ad', storeId: 'oa-jlm-ramot', storeName: 'אושר עד רמות', city: 'ירושלים', address: 'רמות', lat: 31.8209, lng: 35.1891 },
  { chainId: 'osher_ad', storeId: 'oa-beitar', storeName: 'אושר עד ביתר עילית', city: 'ביתר עילית', address: 'הרב שך 1', lat: 31.6961, lng: 35.1165 },
  { chainId: 'osher_ad', storeId: 'oa-bs', storeName: 'אושר עד בית שמש', city: 'בית שמש', address: 'נחל שורק 4', lat: 31.7451, lng: 34.9976 },
  { chainId: 'osher_ad', storeId: 'oa-elad', storeName: 'אושר עד אלעד', city: 'אלעד', address: 'שמעון בן שטח', lat: 32.0525, lng: 34.9520 },

  // ============ טיב טעם ============
  { chainId: 'tiv_taam', storeId: 'tt-tlv', storeName: 'טיב טעם תל אביב', city: 'תל אביב', address: 'הרב קוק 15', lat: 32.0740, lng: 34.7700 },
  { chainId: 'tiv_taam', storeId: 'tt-rg', storeName: 'טיב טעם רמת גן', city: 'רמת גן', address: 'אבא הלל 54', lat: 32.0843, lng: 34.8108 },
  { chainId: 'tiv_taam', storeId: 'tt-herz', storeName: 'טיב טעם הרצליה פיתוח', city: 'הרצליה', address: 'אבא אבן 10', lat: 32.1595, lng: 34.8101 },
  { chainId: 'tiv_taam', storeId: 'tt-rishon', storeName: 'טיב טעם ראשון לציון', city: 'ראשון לציון', address: 'סחרוב 15', lat: 31.9759, lng: 34.7879 },
  { chainId: 'tiv_taam', storeId: 'tt-hf', storeName: 'טיב טעם חיפה', city: 'חיפה', address: 'החלוץ 7', lat: 32.8230, lng: 34.9945 },

  // ============ קשת טעמים ============
  { chainId: 'keshet', storeId: 'ks-rishon', storeName: 'קשת טעמים ראשון לציון', city: 'ראשון לציון', address: 'אבן גבירול 30', lat: 31.9605, lng: 34.7984 },
  { chainId: 'keshet', storeId: 'ks-nz', storeName: 'קשת טעמים נס ציונה', city: 'נס ציונה', address: 'ויצמן 19', lat: 31.9290, lng: 34.7984 },

  // ============ סטופ מרקט ============
  { chainId: 'stop_market', storeId: 'sm-rg', storeName: 'סטופ מרקט רמת גן', city: 'רמת גן', address: 'ביאליק 35', lat: 32.0710, lng: 34.8200 },
  { chainId: 'stop_market', storeId: 'sm-tlv', storeName: 'סטופ מרקט תל אביב', city: 'תל אביב', address: 'דיזנגוף 100', lat: 32.0800, lng: 34.7740 },

  // ============ פוליצר (חיפה) ============
  { chainId: 'politzer', storeId: 'pz-hf-hadar', storeName: 'פוליצר חיפה הדר', city: 'חיפה', address: 'הרצל 18', lat: 32.8200, lng: 34.9900 },

  // ============ דור אלון (דרום) ============
  { chainId: 'doralon', storeId: 'da-ofakim', storeName: 'דור אלון אופקים', city: 'אופקים', address: 'דרך הגיבורים 1', lat: 31.3126, lng: 34.6199 },
  { chainId: 'doralon', storeId: 'da-netivot', storeName: 'דור אלון נתיבות', city: 'נתיבות', address: 'ירושלים 20', lat: 31.4210, lng: 34.5892 },
  { chainId: 'doralon', storeId: 'da-eilat', storeName: 'דור אלון אילת', city: 'אילת', address: 'התמרים 10', lat: 29.5570, lng: 34.9482 },
];
