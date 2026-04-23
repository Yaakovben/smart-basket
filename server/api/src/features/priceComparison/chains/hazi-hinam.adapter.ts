import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * חצי חינם — publishedprices.co.il, משתמש "hazihinam".
 */
export const haziHinamAdapter = createPublishedPricesAdapter({
  chainId: 'hazi_hinam',
  chainName: 'חצי חינם',
  username: 'hazihinam',
});
