import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * חצי חינם — publishedprices.co.il, משתמש "HaziHinam" (H גדולה).
 */
export const haziHinamAdapter = createPublishedPricesAdapter({
  chainId: 'hazi_hinam',
  chainName: 'חצי חינם',
  username: 'HaziHinam',
});
