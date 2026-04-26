import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * קשת — publishedprices.co.il, משתמש "Keshet".
 */
export const keshetAdapter = createPublishedPricesAdapter({
  chainId: 'keshet',
  chainName: 'קשת',
  username: 'Keshet',
});
