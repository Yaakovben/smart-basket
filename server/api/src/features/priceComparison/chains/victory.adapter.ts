import { createLaibcatalogAdapter } from './laibcatalog.factory';

/**
 * ויקטורי - פורטל laibcatalog.co.il (publishedprices.co.il לא משמש יותר).
 * קוד רשת רשמי: 7290696200003.
 */
export const victoryAdapter = createLaibcatalogAdapter({
  chainId: 'victory',
  chainName: 'ויקטורי',
  chainCode: '7290696200003',
});
