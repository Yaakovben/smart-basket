import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * יינות ביתן (מגה) — publishedprices.co.il, משתמש "yohananof".
 * הערה: הרשת הפעילה היא יינות ביתן; מגה/יוחננוף רשומים יחד בפורטל.
 */
export const yenotBitanAdapter = createPublishedPricesAdapter({
  chainId: 'yenot_bitan',
  chainName: 'יינות ביתן',
  username: 'yohananof',
});
