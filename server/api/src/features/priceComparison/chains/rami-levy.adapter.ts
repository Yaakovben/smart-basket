import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * רמי לוי — publishedprices.co.il, משתמש "RamiLevi" (עם i, לא y).
 */
export const ramiLevyAdapter = createPublishedPricesAdapter({
  chainId: 'rami_levy',
  chainName: 'רמי לוי',
  username: 'RamiLevi',
});
