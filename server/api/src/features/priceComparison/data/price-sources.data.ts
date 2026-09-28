/**
 * מיפוי מקורות השקיפות הרשמיים של הרשתות.
 *
 * כל שורה אומתה ב-2026-09-28 בהורדה בפועל של קובץ מכל סוג ובדיקת המבנה שלו
 * (לא מאתר השוואת מחירים). פירוט מלא, כולל בעיות מיוחדות: docs/price-sources.md.
 *
 * רשת שהיא תת-רשת (יש חסד, נטו חיסכון) לא מפרסמת בנפרד: הסניפים שלה מופיעים
 * בקובצי רשת האם, עם SubChainName משלהם בקובץ הסניפים.
 */

export type PortalKind = 'shufersal' | 'published-prices' | 'bina' | 'laibcatalog' | 'carrefour' | 'hazi-hinam';

export interface PriceSource {
  // הרשת כפי שהמשתמש מכיר אותה
  key: string;
  displayName: string;
  // ה-chainId שתחתיו הנתונים נשמרים אצלנו
  chainId: string;
  // שם תת-הרשת בקובץ הסניפים של רשת האם, כשהרשת היא תת-רשת
  subChainName?: string;
  // קוד הרשת הרשמי (13 ספרות) בשמות הקבצים
  chainCode: string;
  portal: PortalKind;
  officialSource: string;
  // איך מגיעים לכל סוג קובץ בפורטל
  storesUrl: string;
  priceFullUrl: string;
  priceUrl: string;
  promoFullUrl: string;
  promoUrl: string;
  format: string;
  verified: boolean;
  verifiedAt: string;
}

const PP = 'https://url.publishedprices.co.il';
const SHUFERSAL = 'https://prices.shufersal.co.il/FileObject/UpdateCategory?storeId=0';
const LAIB = 'https://laibcatalog.co.il/webapi';
const VERIFIED_AT = '2026-09-28';

// פורטל publishedprices: התחברות עם שם משתמש בלי סיסמה, ואז רשימת קבצים
function publishedPrices(key: string, displayName: string, chainId: string, chainCode: string, user: string): PriceSource {
  const list = `${PP}/file (user=${user}) → /file/json/dir`;
  return {
    key, displayName, chainId, chainCode,
    portal: 'published-prices',
    officialSource: `${PP} (Cerberus)`,
    storesUrl: `${list} search=Stores`,
    priceFullUrl: `${list} search=PriceFull, ${PP}/file/d/<file>`,
    priceUrl: `${list} search=Price`,
    promoFullUrl: `${list} search=PromoFull`,
    promoUrl: `${list} search=Promo`,
    format: 'XML gz, קובץ לכל סניף (Stores לכל הרשת)',
    verified: true,
    verifiedAt: VERIFIED_AT,
  };
}

// פורטל Bina: רשימה ב-JSON לפי סוג, ואז כתובת הורדה זמנית
function bina(key: string, displayName: string, chainId: string, chainCode: string, prefix: string, subChainName?: string): PriceSource {
  const list = (t: number) => `http://${prefix}.binaprojects.com/MainIO_Hok.aspx?_=${chainCode}&wReshet=הכל&WFileType=${t}`;
  return {
    key, displayName, chainId, chainCode, subChainName,
    portal: 'bina',
    officialSource: `http://${prefix}.binaprojects.com`,
    storesUrl: list(1),
    priceUrl: list(2),
    promoUrl: list(3),
    priceFullUrl: `${list(4)} → Download.aspx?FileNm=<file> → SPath`,
    promoFullUrl: list(5),
    // בבדיקה היה gzip. בעבר הפורטל שלח zip עם אותה סיומת, והפענוח מזהה לפי חתימת הקובץ
    format: 'XML gz (סיומת GZ), קובץ לכל סניף',
    verified: true,
    verifiedAt: VERIFIED_AT,
  };
}

function laibcatalog(key: string, displayName: string, chainId: string, chainCode: string): PriceSource {
  const list = `${LAIB}/api/getfiles?edi=${chainCode}`;
  return {
    key, displayName, chainId, chainCode,
    portal: 'laibcatalog',
    officialSource: 'https://laibcatalog.co.il',
    storesUrl: `${list} (fileType=stores), ${LAIB}/api/getbranches?edi=${chainCode}`,
    priceFullUrl: `${list} (fileType=pricefull) → ${LAIB}/${chainCode}/<file>`,
    priceUrl: `${list} (fileType=price)`,
    promoFullUrl: `${list} (fileType=promofull)`,
    promoUrl: `${list} (fileType=promo)`,
    format: 'XML gz, קובץ לכל סניף',
    verified: true,
    verifiedAt: VERIFIED_AT,
  };
}

function shufersal(key: string, displayName: string, subChainName?: string): PriceSource {
  return {
    key, displayName, chainId: 'shufersal', chainCode: '7290027600007', subChainName,
    portal: 'shufersal',
    officialSource: 'https://prices.shufersal.co.il',
    storesUrl: `${SHUFERSAL}&catID=5`,
    priceUrl: `${SHUFERSAL}&catID=1`,
    priceFullUrl: `${SHUFERSAL}&catID=2`,
    promoUrl: `${SHUFERSAL}&catID=3`,
    promoFullUrl: `${SHUFERSAL}&catID=4 (&page=N, 20 לדף)`,
    format: 'XML gz ב-Azure blob עם קישור חתום, קובץ לכל סניף',
    verified: true,
    verifiedAt: VERIFIED_AT,
  };
}

export const PRICE_SOURCES: PriceSource[] = [
  shufersal('shufersal', 'שופרסל'),
  shufersal('yesh_chesed', 'יש חסד', 'יש חסד'),
  publishedPrices('rami_levy', 'רמי לוי', 'rami_levy', '7290058140886', 'RamiLevi'),
  publishedPrices('osher_ad', 'אושר עד', 'osher_ad', '7290103152017', 'osherad'),
  publishedPrices('yohananof', 'יוחננוף', 'yohananof', '7290803800003', 'yohananof'),
  {
    key: 'carrefour', displayName: 'קרפור', chainId: 'carrefour', chainCode: '7290055700007',
    portal: 'carrefour',
    officialSource: 'https://prices.carrefour.co.il',
    storesUrl: 'https://prices.carrefour.co.il/ (const files) → /<path>/Stores*.gz',
    priceFullUrl: 'https://prices.carrefour.co.il/<path>/PriceFull*.gz',
    priceUrl: 'https://prices.carrefour.co.il/<path>/Price*.gz',
    promoFullUrl: 'https://prices.carrefour.co.il/<path>/PromoFull*.gz',
    promoUrl: 'https://prices.carrefour.co.il/<path>/Promo*.gz',
    format: 'XML gz, קובץ לכל סניף. רשימת הקבצים מוטמעת ב-JS של הדף',
    verified: true,
    verifiedAt: VERIFIED_AT,
  },
  laibcatalog('victory', 'ויקטורי', 'victory', '7290696200003'),
  bina('maayan_2000', 'מעיין 2000', 'maayan_2000', '7290058159628', 'maayan2000'),
  bina('shefa_birkat_hashem', 'שפע ברכת השם', 'shefa_birkat_hashem', '7290058134977', 'shefabirkathashem'),
  bina('netto_hisachon', 'נטו חיסכון', 'super_sapir', '7290058156016', 'supersapir', 'נטו חיסכון'),
  publishedPrices('tiv_taam', 'טיב טעם', 'tiv_taam', '7290873255550', 'TivTaam'),
  publishedPrices('keshet', 'קשת טעמים', 'keshet', '7290785400000', 'Keshet'),
  {
    key: 'hazi_hinam', displayName: 'חצי חינם', chainId: 'hazi_hinam', chainCode: '7290700100008',
    portal: 'hazi-hinam',
    officialSource: 'https://shop.hazi-hinam.co.il/Prices',
    storesUrl: 'https://shop.hazi-hinam.co.il/Prices?t=3&d=<YYYY-MM-DD>',
    priceFullUrl: 'https://shop.hazi-hinam.co.il/Prices?t=1&d=<YYYY-MM-DD>&p=<N> → hazihinamprod01.blob.core.windows.net/regulatories/PriceFull*.gz',
    priceUrl: 'https://shop.hazi-hinam.co.il/Prices?t=1 (Price*)',
    promoFullUrl: 'https://shop.hazi-hinam.co.il/Prices?t=2 (PromoFull*)',
    promoUrl: 'https://shop.hazi-hinam.co.il/Prices?t=2 (Promo*)',
    format: 'XML gz, קובץ לכל סניף, רשימה בדפי HTML',
    verified: true,
    verifiedAt: VERIFIED_AT,
  },
  laibcatalog('machsanei_hashuk', 'מחסני השוק', 'machsanei_hashuk', '7290661400001'),
  publishedPrices('stop_market', 'סטופ מרקט', 'stop_market', '7290639000004', 'Stop_Market'),
];

// תיאור המקור לשמירה בשדה source של הרשומות
export function sourceLabel(chainId: string): string {
  const s = PRICE_SOURCES.find(p => p.chainId === chainId && !p.subChainName);
  return s ? s.officialSource : chainId;
}
