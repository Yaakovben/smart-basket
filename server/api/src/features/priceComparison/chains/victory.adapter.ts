import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * ויקטורי — publishedprices.co.il, משתמש "Victory".
 * (אם יחזיר 401, יש לבדוק שם משתמש אלטרנטיבי כמו 'victory' באותיות קטנות.)
 */
export const victoryAdapter = createPublishedPricesAdapter({
  chainId: 'victory',
  chainName: 'ויקטורי',
  username: 'Victory',
});
