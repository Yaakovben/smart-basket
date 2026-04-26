import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * אושר עד — publishedprices.co.il, משתמש "osherad", סיסמה ריקה.
 */
export const osherAdAdapter = createPublishedPricesAdapter({
  chainId: 'osher_ad',
  chainName: 'אושר עד',
  username: 'osherad',
});
