import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * דור אלון — publishedprices.co.il, משתמש "doralon".
 */
export const doralonAdapter = createPublishedPricesAdapter({
  chainId: 'doralon',
  chainName: 'דור אלון',
  username: 'doralon',
});
