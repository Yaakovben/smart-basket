import { createLaibcatalogAdapter } from './laibcatalog.factory';

/**
 * מחסני השוק - פורטל laibcatalog.co.il, קוד רשת רשמי 7290661400001.
 * אומת ב-2026-09-28: getfiles מחזיר Stores, Price, PriceFull, Promo, PromoFull,
 * ובקובץ הסניפים ChainName="מחסני השוק". תתי-רשתות: מחסני השוק, בסיטי, בשבילך, מהדרין.
 * קוד הרשת השני שמופיע בתיעוד חיצוני (7290633800006) מחזיר רשימה ריקה.
 */
export const machsaneiHashukAdapter = createLaibcatalogAdapter({
  chainId: 'machsanei_hashuk',
  chainName: 'מחסני השוק',
  chainCode: '7290661400001',
});
