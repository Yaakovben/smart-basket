import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * סטופ מרקט — publishedprices.co.il, משתמש "Stop_Market".
 */
export const stopMarketAdapter = createPublishedPricesAdapter({
  chainId: 'stop_market',
  chainName: 'סטופ מרקט',
  username: 'Stop_Market',
});
