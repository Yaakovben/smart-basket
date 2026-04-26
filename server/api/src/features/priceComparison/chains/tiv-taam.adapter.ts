import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * טיב טעם — publishedprices.co.il, משתמש "TivTaam".
 */
export const tivTaamAdapter = createPublishedPricesAdapter({
  chainId: 'tiv_taam',
  chainName: 'טיב טעם',
  username: 'TivTaam',
});
