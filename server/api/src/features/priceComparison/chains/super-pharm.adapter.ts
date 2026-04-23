import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * סופר-פארם (ל-Life מוצרי צריכה) — publishedprices.co.il, משתמש "SuperPharm".
 */
export const superPharmAdapter = createPublishedPricesAdapter({
  chainId: 'super_pharm',
  chainName: 'סופר-פארם',
  username: 'SuperPharm',
});
