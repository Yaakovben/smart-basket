import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * ויקטורי — publishedprices.co.il, משתמש "Victory".
 */
export const victoryAdapter = createPublishedPricesAdapter({
  chainId: 'victory',
  chainName: 'ויקטורי',
  username: 'Victory',
});
