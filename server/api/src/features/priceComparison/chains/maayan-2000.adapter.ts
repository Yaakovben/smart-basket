import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * מעיין 2000 - publishedprices.co.il, משתמש "Maayan2000".
 * אם שם המשתמש לא תקף בפורטל - צריך להחליף ב-username הנכון
 * (ראה פאנל האדמין אחרי סנכרון ראשון).
 */
export const maayan2000Adapter = createPublishedPricesAdapter({
  chainId: 'maayan_2000',
  chainName: 'מעיין 2000',
  username: 'Maayan2000',
});
