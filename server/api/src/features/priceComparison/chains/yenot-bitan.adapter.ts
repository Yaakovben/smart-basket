import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * יוחננוף — publishedprices.co.il, משתמש "yohananof".
 * (קובץ שומר את השם הקודם yenot-bitan לתאימות אחורה בשמות.)
 */
export const yenotBitanAdapter = createPublishedPricesAdapter({
  chainId: 'yohananof',
  chainName: 'יוחננוף',
  username: 'yohananof',
});
