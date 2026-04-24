import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * פוליצר — publishedprices.co.il, משתמש "politzer".
 */
export const politzerAdapter = createPublishedPricesAdapter({
  chainId: 'politzer',
  chainName: 'פוליצר',
  username: 'politzer',
});
