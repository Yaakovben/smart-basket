/**
 * Seed סטטי של סניפי הרשתות.
 * נתונים ידניים - קואורדינטות מקורבות של סניפים ציבוריים.
 * כיסוי רחב של ערים בישראל כדי שהסניף הקרוב יהיה באמת קרוב.
 *
 * בעתיד ניתן להעביר את זה למודל Branch ב-Mongo ולעדכן מ-API חיצוני.
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
  // ========== שופרסל (הכיסוי הרחב ביותר, ~60 סניפים) ==========
  // גוש דן
  { chainId: 'shufersal', branchName: 'שופרסל דיל תל אביב איבן גבירול', city: 'תל אביב', address: 'איבן גבירול 70', lat: 32.0853, lng: 34.7818 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל תל אביב דיזנגוף', city: 'תל אביב', address: 'דיזנגוף 50', lat: 32.0760, lng: 34.7747 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי תל אביב יפו', city: 'תל אביב', address: 'יפת 30', lat: 32.0540, lng: 34.7517 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי רמת אביב', city: 'תל אביב', address: 'איינשטיין 40', lat: 32.1128, lng: 34.7920 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי רמת גן', city: 'רמת גן', address: 'ביאליק 58', lat: 32.0712, lng: 34.8245 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל גבעתיים', city: 'גבעתיים', address: 'ויצמן 32', lat: 32.0712, lng: 34.8103 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל חולון', city: 'חולון', address: 'סוקולוב 62', lat: 32.0117, lng: 34.7731 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי בת ים', city: 'בת ים', address: 'הרצל 40', lat: 32.0221, lng: 34.7456 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי בני ברק', city: 'בני ברק', address: 'ז\'בוטינסקי 59', lat: 32.0858, lng: 34.8330 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי פתח תקווה', city: 'פתח תקווה', address: 'חיים עוזר 47', lat: 32.0881, lng: 34.8858 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל פתח תקווה סגולה', city: 'פתח תקווה', address: 'סגולה', lat: 32.0990, lng: 34.8692 },
  // השרון
  { chainId: 'shufersal', branchName: 'שופרסל שלי הרצליה', city: 'הרצליה', address: 'סוקולוב 34', lat: 32.1638, lng: 34.8432 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל הרצליה פיתוח', city: 'הרצליה', address: 'מדינת היהודים', lat: 32.1614, lng: 34.8081 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי רמת השרון', city: 'רמת השרון', address: 'סוקולוב 97', lat: 32.1461, lng: 34.8430 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל כפר סבא', city: 'כפר סבא', address: 'ויצמן 150', lat: 32.1781, lng: 34.9100 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי רעננה', city: 'רעננה', address: 'אחוזה 100', lat: 32.1848, lng: 34.8718 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי הוד השרון', city: 'הוד השרון', address: 'דרך רמתיים', lat: 32.1563, lng: 34.8935 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל נתניה', city: 'נתניה', address: 'הרצל 9', lat: 32.3323, lng: 34.8554 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל נתניה פולג', city: 'נתניה', address: 'עמק חפר', lat: 32.2740, lng: 34.8546 },
  // מרכז-דרום
  { chainId: 'shufersal', branchName: 'שופרסל דיל ראשון לציון', city: 'ראשון לציון', address: 'רוטשילד 60', lat: 31.9647, lng: 34.8044 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל ראשון לציון מערב', city: 'ראשון לציון', address: 'סחרוב 15', lat: 31.9797, lng: 34.7890 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל רחובות', city: 'רחובות', address: 'הרצל 189', lat: 31.8946, lng: 34.8108 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי נס ציונה', city: 'נס ציונה', address: 'ויצמן 15', lat: 31.9300, lng: 34.7973 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי רמלה', city: 'רמלה', address: 'הרצל 121', lat: 31.9272, lng: 34.8667 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי לוד', city: 'לוד', address: 'הרצל 80', lat: 31.9510, lng: 34.8981 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל מודיעין', city: 'מודיעין', address: 'עמק דותן', lat: 31.8980, lng: 35.0120 },
  // ירושלים
  { chainId: 'shufersal', branchName: 'שופרסל דיל ירושלים מרכז', city: 'ירושלים', address: 'יפו 97', lat: 31.7881, lng: 35.2189 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי תלפיות', city: 'ירושלים', address: 'פייר קניג', lat: 31.7485, lng: 35.2245 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי גילה', city: 'ירושלים', address: 'דרום גילה', lat: 31.7236, lng: 35.1856 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי מעלה אדומים', city: 'מעלה אדומים', address: 'המלך דוד', lat: 31.7717, lng: 35.2973 },
  // דרום
  { chainId: 'shufersal', branchName: 'שופרסל דיל באר שבע', city: 'באר שבע', address: 'יצחק רגר 1', lat: 31.2498, lng: 34.7920 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל באר שבע נווה זאב', city: 'באר שבע', address: 'נווה זאב', lat: 31.2289, lng: 34.7716 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל אשדוד', city: 'אשדוד', address: 'רוגוזין 51', lat: 31.7897, lng: 34.6461 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי אשדוד רובע י״א', city: 'אשדוד', address: 'שד\' מנחם בגין', lat: 31.7997, lng: 34.6541 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל אשקלון', city: 'אשקלון', address: 'בן גוריון 4', lat: 31.6688, lng: 34.5743 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי קרית גת', city: 'קרית גת', address: 'הנשיא', lat: 31.6102, lng: 34.7642 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל דימונה', city: 'דימונה', address: 'הנשיא', lat: 31.0712, lng: 35.0322 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל אילת', city: 'אילת', address: 'התמרים', lat: 29.5574, lng: 34.9490 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל נתיבות', city: 'נתיבות', address: 'ירושלים 15', lat: 31.4210, lng: 34.5892 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל אופקים', city: 'אופקים', address: 'הרצל', lat: 31.3126, lng: 34.6199 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי שדרות', city: 'שדרות', address: 'מנחם בגין', lat: 31.5242, lng: 34.5960 },
  // צפון
  { chainId: 'shufersal', branchName: 'שופרסל דיל חיפה חוף', city: 'חיפה', address: 'החלוץ', lat: 32.8075, lng: 34.9917 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל חיפה קריות', city: 'חיפה', address: 'דרך בר יהודה', lat: 32.8345, lng: 35.0843 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל חיפה גרנד קניון', city: 'חיפה', address: 'ההסתדרות', lat: 32.8100, lng: 35.0270 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל קרית ביאליק', city: 'קרית ביאליק', address: 'שד\' ירושלים', lat: 32.8456, lng: 35.0818 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי קרית מוצקין', city: 'קרית מוצקין', address: 'בן גוריון', lat: 32.8352, lng: 35.0798 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל קרית אתא', city: 'קרית אתא', address: 'העצמאות', lat: 32.8048, lng: 35.0984 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל נהריה', city: 'נהריה', address: 'הגעתון 50', lat: 33.0086, lng: 35.0983 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי עכו', city: 'עכו', address: 'בן עמי', lat: 32.9281, lng: 35.0818 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל כרמיאל', city: 'כרמיאל', address: 'נשיאי ישראל', lat: 32.9177, lng: 35.2927 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל טבריה', city: 'טבריה', address: 'הגליל 10', lat: 32.7906, lng: 35.5312 },
  { chainId: 'shufersal', branchName: 'שופרסל שלי צפת', city: 'צפת', address: 'ירושלים', lat: 32.9619, lng: 35.4989 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל עפולה', city: 'עפולה', address: 'הנשיא', lat: 32.6069, lng: 35.2912 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל בית שאן', city: 'בית שאן', address: 'שאול המלך', lat: 32.4970, lng: 35.4989 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל נצרת עילית', city: 'נוף הגליל', address: 'המלכים', lat: 32.7070, lng: 35.3162 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל חדרה', city: 'חדרה', address: 'הרברט סמואל', lat: 32.4395, lng: 34.9182 },
  { chainId: 'shufersal', branchName: 'שופרסל דיל פרדס חנה', city: 'פרדס חנה כרכור', address: 'הבנים', lat: 32.4729, lng: 34.9707 },

  // ========== רמי לוי (~35 סניפים) ==========
  { chainId: 'rami_levy', branchName: 'רמי לוי גבעת שאול', city: 'ירושלים', address: 'הפסגה 49', lat: 31.7902, lng: 35.1908 },
  { chainId: 'rami_levy', branchName: 'רמי לוי תלפיות', city: 'ירושלים', address: 'יד חרוצים 12', lat: 31.7476, lng: 35.2321 },
  { chainId: 'rami_levy', branchName: 'רמי לוי מלחה', city: 'ירושלים', address: 'אגודת ספורט הפועל 1', lat: 31.7498, lng: 35.1870 },
  { chainId: 'rami_levy', branchName: 'רמי לוי מעלה אדומים', city: 'מעלה אדומים', address: 'דרך האשדות', lat: 31.7700, lng: 35.3040 },
  { chainId: 'rami_levy', branchName: 'רמי לוי מודיעין', city: 'מודיעין', address: 'יצחק רבין 1', lat: 31.8988, lng: 35.0078 },
  { chainId: 'rami_levy', branchName: 'רמי לוי בית שמש', city: 'בית שמש', address: 'יגאל אלון', lat: 31.7496, lng: 34.9991 },
  { chainId: 'rami_levy', branchName: 'רמי לוי ראשון לציון', city: 'ראשון לציון', address: 'משה דיין 1', lat: 31.9801, lng: 34.7851 },
  { chainId: 'rami_levy', branchName: 'רמי לוי רחובות', city: 'רחובות', address: 'פלי"ם 10', lat: 31.8889, lng: 34.8042 },
  { chainId: 'rami_levy', branchName: 'רמי לוי נס ציונה', city: 'נס ציונה', address: 'ויצמן 95', lat: 31.9285, lng: 34.8014 },
  { chainId: 'rami_levy', branchName: 'רמי לוי רמלה', city: 'רמלה', address: 'דני מס 12', lat: 31.9288, lng: 34.8745 },
  { chainId: 'rami_levy', branchName: 'רמי לוי לוד', city: 'לוד', address: 'דוד רמז 40', lat: 31.9594, lng: 34.8992 },
  { chainId: 'rami_levy', branchName: 'רמי לוי תל אביב לוינסקי', city: 'תל אביב', address: 'לוינסקי 108', lat: 32.0545, lng: 34.7793 },
  { chainId: 'rami_levy', branchName: 'רמי לוי תל אביב יפו', city: 'תל אביב', address: 'קיבוץ גלויות', lat: 32.0449, lng: 34.7650 },
  { chainId: 'rami_levy', branchName: 'רמי לוי חולון', city: 'חולון', address: 'הסוללים', lat: 32.0170, lng: 34.7828 },
  { chainId: 'rami_levy', branchName: 'רמי לוי בת ים', city: 'בת ים', address: 'בלפור', lat: 32.0232, lng: 34.7492 },
  { chainId: 'rami_levy', branchName: 'רמי לוי פתח תקווה', city: 'פתח תקווה', address: 'כביש גהה', lat: 32.0895, lng: 34.8915 },
  { chainId: 'rami_levy', branchName: 'רמי לוי בני ברק', city: 'בני ברק', address: 'ז\'בוטינסקי 170', lat: 32.0840, lng: 34.8336 },
  { chainId: 'rami_levy', branchName: 'רמי לוי רמת גן', city: 'רמת גן', address: 'אבא הלל 82', lat: 32.0830, lng: 34.8129 },
  { chainId: 'rami_levy', branchName: 'רמי לוי הרצליה', city: 'הרצליה', address: 'אבא אבן 10', lat: 32.1595, lng: 34.8101 },
  { chainId: 'rami_levy', branchName: 'רמי לוי כפר סבא', city: 'כפר סבא', address: 'תשלם', lat: 32.1842, lng: 34.9214 },
  { chainId: 'rami_levy', branchName: 'רמי לוי נתניה פולג', city: 'נתניה', address: 'פולג', lat: 32.2756, lng: 34.8589 },
  { chainId: 'rami_levy', branchName: 'רמי לוי חדרה', city: 'חדרה', address: 'דפנה 11', lat: 32.4390, lng: 34.9218 },
  { chainId: 'rami_levy', branchName: 'רמי לוי חיפה חוצות המפרץ', city: 'חיפה', address: 'פלימן 15', lat: 32.7940, lng: 35.0100 },
  { chainId: 'rami_levy', branchName: 'רמי לוי חיפה קריות', city: 'קרית ביאליק', address: 'ויצמן', lat: 32.8353, lng: 35.0850 },
  { chainId: 'rami_levy', branchName: 'רמי לוי עפולה', city: 'עפולה', address: 'הנשיא', lat: 32.6080, lng: 35.2900 },
  { chainId: 'rami_levy', branchName: 'רמי לוי טבריה', city: 'טבריה', address: 'יהודה הלוי', lat: 32.7914, lng: 35.5356 },
  { chainId: 'rami_levy', branchName: 'רמי לוי כרמיאל', city: 'כרמיאל', address: 'תחנת האשף', lat: 32.9159, lng: 35.2971 },
  { chainId: 'rami_levy', branchName: 'רמי לוי באר שבע', city: 'באר שבע', address: 'דרך חברון 50', lat: 31.2465, lng: 34.8045 },
  { chainId: 'rami_levy', branchName: 'רמי לוי באר שבע ביג', city: 'באר שבע', address: 'בן צבי', lat: 31.2700, lng: 34.7960 },
  { chainId: 'rami_levy', branchName: 'רמי לוי אשדוד', city: 'אשדוד', address: 'הגדוד העברי 20', lat: 31.7921, lng: 34.6521 },
  { chainId: 'rami_levy', branchName: 'רמי לוי אשקלון', city: 'אשקלון', address: 'צה"ל 20', lat: 31.6715, lng: 34.5800 },
  { chainId: 'rami_levy', branchName: 'רמי לוי קרית גת', city: 'קרית גת', address: 'הנשיא 10', lat: 31.6102, lng: 34.7642 },
  { chainId: 'rami_levy', branchName: 'רמי לוי אילת', city: 'אילת', address: 'הנגב', lat: 29.5480, lng: 34.9528 },
  { chainId: 'rami_levy', branchName: 'רמי לוי דימונה', city: 'דימונה', address: 'הנשיא', lat: 31.0689, lng: 35.0340 },

  // ========== יוחננוף (~25 סניפים) ==========
  { chainId: 'yohananof', branchName: 'יוחננוף תל אביב יגאל אלון', city: 'תל אביב', address: 'יגאל אלון 76', lat: 32.0712, lng: 34.7930 },
  { chainId: 'yohananof', branchName: 'יוחננוף חולון', city: 'חולון', address: 'הרצל 110', lat: 32.0098, lng: 34.7765 },
  { chainId: 'yohananof', branchName: 'יוחננוף בת ים', city: 'בת ים', address: 'יוספטל', lat: 32.0148, lng: 34.7483 },
  { chainId: 'yohananof', branchName: 'יוחננוף ראשון לציון', city: 'ראשון לציון', address: 'הרצל 120', lat: 31.9599, lng: 34.8012 },
  { chainId: 'yohananof', branchName: 'יוחננוף ראשון לציון רמב"ם', city: 'ראשון לציון', address: 'רמב"ם', lat: 31.9695, lng: 34.7937 },
  { chainId: 'yohananof', branchName: 'יוחננוף פתח תקווה', city: 'פתח תקווה', address: 'ז\'בוטינסקי 90', lat: 32.0884, lng: 34.8778 },
  { chainId: 'yohananof', branchName: 'יוחננוף רמת גן', city: 'רמת גן', address: 'ביאליק', lat: 32.0770, lng: 34.8220 },
  { chainId: 'yohananof', branchName: 'יוחננוף גבעתיים', city: 'גבעתיים', address: 'כצנלסון', lat: 32.0700, lng: 34.8100 },
  { chainId: 'yohananof', branchName: 'יוחננוף בני ברק', city: 'בני ברק', address: 'רבי עקיבא', lat: 32.0850, lng: 34.8340 },
  { chainId: 'yohananof', branchName: 'יוחננוף הרצליה', city: 'הרצליה', address: 'סוקולוב', lat: 32.1640, lng: 34.8430 },
  { chainId: 'yohananof', branchName: 'יוחננוף כפר סבא', city: 'כפר סבא', address: 'ויצמן 120', lat: 32.1770, lng: 34.9082 },
  { chainId: 'yohananof', branchName: 'יוחננוף נתניה', city: 'נתניה', address: 'הרצל 30', lat: 32.3300, lng: 34.8570 },
  { chainId: 'yohananof', branchName: 'יוחננוף רחובות', city: 'רחובות', address: 'בנימין 21', lat: 31.8934, lng: 34.8085 },
  { chainId: 'yohananof', branchName: 'יוחננוף נס ציונה', city: 'נס ציונה', address: 'הבנים', lat: 31.9315, lng: 34.7988 },
  { chainId: 'yohananof', branchName: 'יוחננוף ירושלים', city: 'ירושלים', address: 'בית וגן', lat: 31.7710, lng: 35.1840 },
  { chainId: 'yohananof', branchName: 'יוחננוף מודיעין', city: 'מודיעין', address: 'עמק דותן', lat: 31.8995, lng: 35.0100 },
  { chainId: 'yohananof', branchName: 'יוחננוף רמלה', city: 'רמלה', address: 'דני מס', lat: 31.9280, lng: 34.8690 },
  { chainId: 'yohananof', branchName: 'יוחננוף חיפה', city: 'חיפה', address: 'דרך יפו 211', lat: 32.8186, lng: 34.9876 },
  { chainId: 'yohananof', branchName: 'יוחננוף קרית ביאליק', city: 'קרית ביאליק', address: 'ויצמן', lat: 32.8440, lng: 35.0820 },
  { chainId: 'yohananof', branchName: 'יוחננוף עפולה', city: 'עפולה', address: 'הנשיא', lat: 32.6040, lng: 35.2910 },
  { chainId: 'yohananof', branchName: 'יוחננוף חדרה', city: 'חדרה', address: 'הגיבורים', lat: 32.4380, lng: 34.9190 },
  { chainId: 'yohananof', branchName: 'יוחננוף באר שבע', city: 'באר שבע', address: 'שדרות בן גוריון 8', lat: 31.2518, lng: 34.7913 },
  { chainId: 'yohananof', branchName: 'יוחננוף אשדוד', city: 'אשדוד', address: 'מנחם בגין 2', lat: 31.8005, lng: 34.6538 },
  { chainId: 'yohananof', branchName: 'יוחננוף אשקלון', city: 'אשקלון', address: 'בן גוריון', lat: 31.6705, lng: 34.5770 },
  { chainId: 'yohananof', branchName: 'יוחננוף קרית גת', city: 'קרית גת', address: 'הנשיא', lat: 31.6120, lng: 34.7650 },

  // ========== אושר עד (~20 סניפים, חרדי) ==========
  { chainId: 'osher_ad', branchName: 'אושר עד בני ברק רבי עקיבא', city: 'בני ברק', address: 'רבי עקיבא 15', lat: 32.0838, lng: 34.8355 },
  { chainId: 'osher_ad', branchName: 'אושר עד בני ברק רמת אלחנן', city: 'בני ברק', address: 'רמת אלחנן', lat: 32.0905, lng: 34.8424 },
  { chainId: 'osher_ad', branchName: 'אושר עד מודיעין עילית', city: 'מודיעין עילית', address: 'נתיבות המשפט 30', lat: 31.9336, lng: 35.0421 },
  { chainId: 'osher_ad', branchName: 'אושר עד ביתר עילית', city: 'ביתר עילית', address: 'הרב שך 1', lat: 31.6961, lng: 35.1165 },
  { chainId: 'osher_ad', branchName: 'אושר עד רמות ירושלים', city: 'ירושלים', address: 'רמות 5', lat: 31.8209, lng: 35.1891 },
  { chainId: 'osher_ad', branchName: 'אושר עד גבעת שאול', city: 'ירושלים', address: 'הפסגה', lat: 31.7895, lng: 35.1920 },
  { chainId: 'osher_ad', branchName: 'אושר עד הר חומה', city: 'ירושלים', address: 'הר חומה', lat: 31.7174, lng: 35.2227 },
  { chainId: 'osher_ad', branchName: 'אושר עד בית שמש רמת בית שמש', city: 'בית שמש', address: 'נחל שורק 4', lat: 31.7451, lng: 34.9976 },
  { chainId: 'osher_ad', branchName: 'אושר עד אלעד', city: 'אלעד', address: 'שמעון בן שטח', lat: 32.0525, lng: 34.9520 },
  { chainId: 'osher_ad', branchName: 'אושר עד אשדוד רובע ז', city: 'אשדוד', address: 'אורי צבי גרינברג', lat: 31.7835, lng: 34.6400 },
  { chainId: 'osher_ad', branchName: 'אושר עד אשדוד רובע יא', city: 'אשדוד', address: 'רובע י"א', lat: 31.7995, lng: 34.6565 },
  { chainId: 'osher_ad', branchName: 'אושר עד עמנואל', city: 'עמנואל', address: 'הרב פיינשטיין', lat: 32.1594, lng: 35.1364 },
  { chainId: 'osher_ad', branchName: 'אושר עד רכסים', city: 'רכסים', address: 'הרב עובדיה', lat: 32.7449, lng: 35.0902 },
  { chainId: 'osher_ad', branchName: 'אושר עד קרית ספר', city: 'מודיעין עילית', address: 'קרית ספר', lat: 31.9347, lng: 35.0370 },
  { chainId: 'osher_ad', branchName: 'אושר עד תל ציון', city: 'תל ציון', address: 'כוכב יעקב', lat: 31.9115, lng: 35.2530 },
  { chainId: 'osher_ad', branchName: 'אושר עד אופקים', city: 'אופקים', address: 'דרך הגיבורים', lat: 31.3135, lng: 34.6212 },
  { chainId: 'osher_ad', branchName: 'אושר עד נתיבות', city: 'נתיבות', address: 'ירושלים', lat: 31.4200, lng: 34.5880 },
  { chainId: 'osher_ad', branchName: 'אושר עד חיפה הדר', city: 'חיפה', address: 'הרצל', lat: 32.8183, lng: 34.9940 },
  { chainId: 'osher_ad', branchName: 'אושר עד קרית גת', city: 'קרית גת', address: 'הרצל', lat: 31.6110, lng: 34.7635 },
  { chainId: 'osher_ad', branchName: 'אושר עד רמלה', city: 'רמלה', address: 'הרצל', lat: 31.9268, lng: 34.8665 },

  // ========== חצי חינם (~15 סניפים) ==========
  { chainId: 'hazi_hinam', branchName: 'חצי חינם תל אביב לוינסקי', city: 'תל אביב', address: 'לוינסקי 90', lat: 32.0534, lng: 34.7780 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם תל אביב רמת אביב', city: 'תל אביב', address: 'איינשטיין', lat: 32.1140, lng: 34.7900 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם בני ברק', city: 'בני ברק', address: 'ז\'בוטינסקי 27', lat: 32.0860, lng: 34.8341 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם פתח תקווה', city: 'פתח תקווה', address: 'ההסתדרות 35', lat: 32.0922, lng: 34.8879 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם רמת גן', city: 'רמת גן', address: 'ז\'בוטינסקי 105', lat: 32.0822, lng: 34.8189 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם הרצליה', city: 'הרצליה', address: 'סוקולוב 38', lat: 32.1640, lng: 34.8430 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם ראשון לציון', city: 'ראשון לציון', address: 'הרצל', lat: 31.9600, lng: 34.8020 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם חולון', city: 'חולון', address: 'הרצל', lat: 32.0100, lng: 34.7760 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם רחובות', city: 'רחובות', address: 'הרצל', lat: 31.8950, lng: 34.8110 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם נתניה', city: 'נתניה', address: 'הרצל', lat: 32.3320, lng: 34.8560 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם כפר סבא', city: 'כפר סבא', address: 'ויצמן', lat: 32.1780, lng: 34.9100 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם ירושלים', city: 'ירושלים', address: 'יפו', lat: 31.7885, lng: 35.2195 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם באר שבע', city: 'באר שבע', address: 'הנשיאים', lat: 31.2500, lng: 34.7920 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם אשדוד', city: 'אשדוד', address: 'רוגוזין', lat: 31.7900, lng: 34.6465 },
  { chainId: 'hazi_hinam', branchName: 'חצי חינם חיפה', city: 'חיפה', address: 'הנשיא', lat: 32.8080, lng: 34.9920 },

  // ========== טיב טעם (~10 סניפים) ==========
  { chainId: 'tiv_taam', branchName: 'טיב טעם תל אביב הרב קוק', city: 'תל אביב', address: 'הרב קוק 15', lat: 32.0740, lng: 34.7700 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם רמת גן אבא הלל', city: 'רמת גן', address: 'אבא הלל 54', lat: 32.0843, lng: 34.8108 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם הרצליה פיתוח', city: 'הרצליה', address: 'אבא אבן 10', lat: 32.1595, lng: 34.8101 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם ראשון לציון', city: 'ראשון לציון', address: 'סחרוב 15', lat: 31.9759, lng: 34.7879 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם נתניה', city: 'נתניה', address: 'בנימין 1', lat: 32.3300, lng: 34.8580 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם חיפה', city: 'חיפה', address: 'החלוץ 7', lat: 32.8230, lng: 34.9945 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם חיפה קניון', city: 'חיפה', address: 'גרנד קניון', lat: 32.8100, lng: 35.0270 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם גבעתיים', city: 'גבעתיים', address: 'ויצמן', lat: 32.0715, lng: 34.8110 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם באר שבע', city: 'באר שבע', address: 'שדרות רגר', lat: 31.2510, lng: 34.7920 },
  { chainId: 'tiv_taam', branchName: 'טיב טעם אילת', city: 'אילת', address: 'קניון האדום', lat: 29.5570, lng: 34.9482 },

  // ========== קשת (~5 סניפים) ==========
  { chainId: 'keshet', branchName: 'קשת טעמים ראשון לציון', city: 'ראשון לציון', address: 'אבן גבירול 30', lat: 31.9605, lng: 34.7984 },
  { chainId: 'keshet', branchName: 'קשת טעמים נס ציונה', city: 'נס ציונה', address: 'ויצמן 19', lat: 31.9290, lng: 34.7984 },
  { chainId: 'keshet', branchName: 'קשת טעמים רחובות', city: 'רחובות', address: 'הרצל', lat: 31.8945, lng: 34.8095 },
  { chainId: 'keshet', branchName: 'קשת טעמים תל אביב', city: 'תל אביב', address: 'דיזנגוף', lat: 32.0800, lng: 34.7750 },
  { chainId: 'keshet', branchName: 'קשת טעמים רמת גן', city: 'רמת גן', address: 'ביאליק', lat: 32.0760, lng: 34.8210 },

  // ========== סטופ מרקט (~5 סניפים) ==========
  { chainId: 'stop_market', branchName: 'סטופ מרקט רמת גן', city: 'רמת גן', address: 'ביאליק 35', lat: 32.0710, lng: 34.8200 },
  { chainId: 'stop_market', branchName: 'סטופ מרקט תל אביב דיזנגוף', city: 'תל אביב', address: 'דיזנגוף 100', lat: 32.0800, lng: 34.7740 },
  { chainId: 'stop_market', branchName: 'סטופ מרקט הרצליה', city: 'הרצליה', address: 'סוקולוב', lat: 32.1635, lng: 34.8425 },
  { chainId: 'stop_market', branchName: 'סטופ מרקט פתח תקווה', city: 'פתח תקווה', address: 'מוטה גור', lat: 32.0893, lng: 34.8870 },
  { chainId: 'stop_market', branchName: 'סטופ מרקט חיפה', city: 'חיפה', address: 'הנשיא', lat: 32.8080, lng: 34.9920 },

  // ========== פוליצר (~3 סניפים) ==========
  { chainId: 'politzer', branchName: 'פוליצר חיפה הדר', city: 'חיפה', address: 'הרצל 18', lat: 32.8200, lng: 34.9900 },
  { chainId: 'politzer', branchName: 'פוליצר חיפה נווה שאנן', city: 'חיפה', address: 'הפועל', lat: 32.7840, lng: 35.0200 },
  { chainId: 'politzer', branchName: 'פוליצר קרית חיים', city: 'חיפה', address: 'אח"י אילת', lat: 32.8315, lng: 35.0665 },

  // ========== דור אלון (~10 סניפים, דרום בעיקר) ==========
  { chainId: 'doralon', branchName: 'דור אלון אופקים', city: 'אופקים', address: 'דרך הגיבורים 1', lat: 31.3126, lng: 34.6199 },
  { chainId: 'doralon', branchName: 'דור אלון נתיבות', city: 'נתיבות', address: 'ירושלים 20', lat: 31.4210, lng: 34.5892 },
  { chainId: 'doralon', branchName: 'דור אלון אילת', city: 'אילת', address: 'התמרים 10', lat: 29.5570, lng: 34.9482 },
  { chainId: 'doralon', branchName: 'דור אלון שדרות', city: 'שדרות', address: 'מנחם בגין', lat: 31.5245, lng: 34.5962 },
  { chainId: 'doralon', branchName: 'דור אלון דימונה', city: 'דימונה', address: 'הנשיא', lat: 31.0695, lng: 35.0330 },
  { chainId: 'doralon', branchName: 'דור אלון ערד', city: 'ערד', address: 'הפלמ"ח', lat: 31.2595, lng: 35.2130 },
  { chainId: 'doralon', branchName: 'דור אלון קרית גת', city: 'קרית גת', address: 'הנשיא', lat: 31.6120, lng: 34.7638 },
  { chainId: 'doralon', branchName: 'דור אלון שדרות הנשיאים', city: 'באר שבע', address: 'שדרות הנשיאים', lat: 31.2500, lng: 34.7910 },
  { chainId: 'doralon', branchName: 'דור אלון ירוחם', city: 'ירוחם', address: 'המייסדים', lat: 30.9883, lng: 34.9258 },
  { chainId: 'doralon', branchName: 'דור אלון מצפה רמון', city: 'מצפה רמון', address: 'המתמיד', lat: 30.6100, lng: 34.8000 },
];
