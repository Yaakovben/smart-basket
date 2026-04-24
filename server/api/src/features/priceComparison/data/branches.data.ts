/**
 * Seed סטטי של סניפי הרשתות.
 * נתונים ידניים - קואורדינטות מקורבות של כתובות ציבוריות של הסניפים הגדולים.
 * בעתיד ניתן להעביר את זה למודל Branch ב-Mongo ולעדכן מ-API חיצוני.
 *
 * מבנה: chainId (תואם ל-ChainId במודל Price) + שם סניף + עיר + lat/lng.
 * אחרי החישוב של הסניף הקרוב, ה-service מחזיר את הרשומה הזו ל-UI כדי להציג
 * שם וכתובת + לפתוח ניווט.
 */

import type { ChainId } from '../models/Price.model';

export interface BranchSeed {
  chainId: ChainId;
  branchName: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
}

export const BRANCHES: BranchSeed[] = [
  // ===== שופרסל =====
  { chainId: 'shufersal', branchName: 'שופרסל דיל תל אביב', city: 'תל אביב', address: 'איבן גבירול 70', lat: 32.0853, lng: 34.7818 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי רמת גן', city: 'רמת גן', address: 'ביאליק 58', lat: 32.0712, lng: 34.8245 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל ירושלים', city: 'ירושלים', address: 'יפו 97', lat: 31.7881, lng: 35.2189 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל חיפה', city: 'חיפה', address: 'הנשיא 124', lat: 32.8075, lng: 34.9917 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל באר שבע', city: 'באר שבע', address: 'יצחק רגר 1', lat: 31.2498, lng: 34.7920 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי נתניה', city: 'נתניה', address: 'הרצל 9', lat: 32.3323, lng: 34.8554 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל ראשון לציון', city: 'ראשון לציון', address: 'רוטשילד 60', lat: 31.9647, lng: 34.8044 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי פתח תקווה', city: 'פתח תקווה', address: 'חיים עוזר 47', lat: 32.0881, lng: 34.8858 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל חולון', city: 'חולון', address: 'סוקולוב 62', lat: 32.0117, lng: 34.7731 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל אשדוד', city: 'אשדוד', address: 'רוגוזין 51', lat: 31.7897, lng: 34.6461 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי רחובות', city: 'רחובות', address: 'הרצל 189', lat: 31.8946, lng: 34.8108 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל אשקלון', city: 'אשקלון', address: 'בן גוריון 4', lat: 31.6688, lng: 34.5743 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל כפר סבא', city: 'כפר סבא', address: 'ויצמן 150', lat: 32.1781, lng: 34.9100 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי הרצליה', city: 'הרצליה', address: 'סוקולוב 34', lat: 32.1638, lng: 34.8432 },

  // ===== רמי לוי =====
  { chainId: 'rami_levy', branchName: 'רמי לוי גבעת שאול', city: 'ירושלים', address: 'הפסגה 49', lat: 31.7902, lng: 35.1908 },
  { chainId: 'rami_levy', branchName: 'רמי לוי מודיעין', city: 'מודיעין', address: 'יצחק רבין 1', lat: 31.8988, lng: 35.0078 },
  { chainId: 'rami_levy', branchName: 'רמי לוי תלפיות', city: 'ירושלים', address: 'יד חרוצים 12', lat: 31.7476, lng: 35.2321 },
  { chainId: 'rami_levy', branchName: 'רמי לוי ראשון לציון', city: 'ראשון לציון', address: 'משה דיין 1', lat: 31.9801, lng: 34.7851 },
  { chainId: 'rami_levy', branchName: 'רמי לוי באר שבע', city: 'באר שבע', address: 'דרך חברון 50', lat: 31.2465, lng: 34.8045 },
  { chainId: 'rami_levy', branchName: 'רמי לוי אשדוד', city: 'אשדוד', address: 'הגדוד העברי 20', lat: 31.7921, lng: 34.6521 },
  { chainId: 'rami_levy', branchName: 'רמי לוי נתניה', city: 'נתניה', address: 'פולג', lat: 32.2756, lng: 34.8589 },
  { chainId: 'rami_levy', branchName: 'רמי לוי חדרה', city: 'חדרה', address: 'דפנה 11', lat: 32.4390, lng: 34.9218 },
  { chainId: 'rami_levy', branchName: 'רמי לוי תל אביב', city: 'תל אביב', address: 'לוינסקי 108', lat: 32.0545, lng: 34.7793 },
  { chainId: 'rami_levy', branchName: 'רמי לוי חיפה', city: 'חיפה', address: 'פלימן 15', lat: 32.7940, lng: 35.0100 },
  { chainId: 'rami_levy', branchName: 'רמי לוי קרית גת', city: 'קרית גת', address: 'הנשיא 10', lat: 31.6102, lng: 34.7642 },
  { chainId: 'rami_levy', branchName: 'רמי לוי בית שמש', city: 'בית שמש', address: 'יגאל אלון', lat: 31.7496, lng: 34.9991 },

  // ===== יוחננוף =====
  { chainId: 'yohananof', branchName: 'יוחננוף תל אביב', city: 'תל אביב', address: 'יגאל אלון 76', lat: 32.0712, lng: 34.7930 },
  { chainId: 'yohananof', branchName: 'יוחננוף חולון', city: 'חולון', address: 'הרצל 110', lat: 32.0098, lng: 34.7765 },
  { chainId: 'yohananof', branchName: 'יוחננוף ראשון לציון', city: 'ראשון לציון', address: 'הרצל 120', lat: 31.9599, lng: 34.8012 },
  { chainId: 'yohananof', branchName: 'יוחננוף פתח תקווה', city: 'פתח תקווה', address: 'ז\'בוטינסקי 90', lat: 32.0884, lng: 34.8778 },
  { chainId: 'yohananof', branchName: 'יוחננוף רחובות', city: 'רחובות', address: 'בנימין 21', lat: 31.8934, lng: 34.8085 },
  { chainId: 'yohananof', branchName: 'יוחננוף באר שבע', city: 'באר שבע', address: 'שדרות בן גוריון 8', lat: 31.2518, lng: 34.7913 },
  { chainId: 'yohananof', branchName: 'יוחננוף אשדוד', city: 'אשדוד', address: 'מנחם בגין 2', lat: 31.8005, lng: 34.6538 },
  { chainId: 'yohananof', branchName: 'יוחננוף חיפה', city: 'חיפה', address: 'דרך יפו 211', lat: 32.8186, lng: 34.9876 },

  // ===== טיב טעם =====
  { chainId: 'tiv_taam', branchName: 'טיב טעם תל אביב', city: 'תל אביב', address: 'הרב קוק 15', lat: 32.0740, lng: 34.7700 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם רמת גן', city: 'רמת גן', address: 'אבא הלל 54', lat: 32.0843, lng: 34.8108 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם הרצליה פיתוח', city: 'הרצליה', address: 'אבא אבן 10', lat: 32.1595, lng: 34.8101 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם חיפה', city: 'חיפה', address: 'החלוץ 7', lat: 32.8230, lng: 34.9945 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם ראשון לציון', city: 'ראשון לציון', address: 'סחרוב 15', lat: 31.9759, lng: 34.7879 },

  // ===== אושר עד =====
  { chainId: 'osher_ad', branchName: 'אושר עד בני ברק', city: 'בני ברק', address: 'רבי עקיבא 15', lat: 32.0838, lng: 34.8355 },
  { chainId: 'osher_ad', branchName: 'אושר עד מודיעין עילית', city: 'מודיעין עילית', address: 'נתיבות המשפט 30', lat: 31.9336, lng: 35.0421 },
  { chainId: 'osher_ad', branchName: 'אושר עד רמות ירושלים', city: 'ירושלים', address: 'רמות 5', lat: 31.8209, lng: 35.1891 },
  { chainId: 'osher_ad', branchName: 'אושר עד ביתר עילית', city: 'ביתר עילית', address: 'הרב שך 1', lat: 31.6961, lng: 35.1165 },
  { chainId: 'osher_ad', branchName: 'אושר עד בית שמש', city: 'בית שמש', address: 'נחל שורק 4', lat: 31.7451, lng: 34.9976 },
  { chainId: 'osher_ad', branchName: 'אושר עד אשדוד רובע ז', city: 'אשדוד', address: 'אורי צבי גרינברג', lat: 31.7835, lng: 34.6400 },
  { chainId: 'osher_ad', branchName: 'אושר עד עמנואל', city: 'עמנואל', address: 'הרב פיינשטיין', lat: 32.1594, lng: 35.1364 },

  // ===== חצי חינם =====
  { chainId: 'hazi_hinam', branchName: 'חצי חינם תל אביב', city: 'תל אביב', address: 'לוינסקי 90', lat: 32.0534, lng: 34.7780 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם בני ברק', city: 'בני ברק', address: 'ז\'בוטינסקי 27', lat: 32.0860, lng: 34.8341 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם פתח תקווה', city: 'פתח תקווה', address: 'ההסתדרות 35', lat: 32.0922, lng: 34.8879 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם רמת גן', city: 'רמת גן', address: 'ז\'בוטינסקי 105', lat: 32.0822, lng: 34.8189 },

  // ===== קשת =====
  { chainId: 'keshet', branchName: 'קשת טעמים ראשון לציון', city: 'ראשון לציון', address: 'אבן גבירול 30', lat: 31.9605, lng: 34.7984 },
  { chainId: 'keshet', branchName: 'קשת טעמים נס ציונה', city: 'נס ציונה', address: 'ויצמן 19', lat: 31.9290, lng: 34.7984 },

  // ===== סטופ מרקט =====
  { chainId: 'stop_market', branchName: 'סטופ מרקט רמת גן', city: 'רמת גן', address: 'ביאליק 35', lat: 32.0710, lng: 34.8200 },
  { chainId: 'stop_market', branchName: 'סטופ מרקט תל אביב', city: 'תל אביב', address: 'דיזנגוף 100', lat: 32.0800, lng: 34.7740 },

  // ===== פוליצר =====
  { chainId: 'politzer', branchName: 'פוליצר חיפה', city: 'חיפה', address: 'הרצל 18', lat: 32.8200, lng: 34.9900 },

  // ===== דור אלון =====
  { chainId: 'doralon', branchName: 'דור אלון אופקים', city: 'אופקים', address: 'דרך הגיבורים 1', lat: 31.3126, lng: 34.6199 },
  { chainId: 'doralon', branchName: 'דור אלון נתיבות', city: 'נתיבות', address: 'ירושלים 20', lat: 31.4210, lng: 34.5892 },
  { chainId: 'doralon', branchName: 'דור אלון אילת', city: 'אילת', address: 'התמרים 10', lat: 29.5570, lng: 34.9482 },
];
