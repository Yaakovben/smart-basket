import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * אושר עד — publishedprices.co.il, סיסמה ריקה.
 * מספר מועמדי username (לא רק "osherad") - כי username יחיד קבוע גרם
 * לכשל אימות שקט (auth_failed_for_user) שהשאיר את מחירי הרשת ריקים.
 */
export const osherAdAdapter = createPublishedPricesAdapter({
  chainId: 'osher_ad',
  chainName: 'אושר עד',
  username: ['osherad', 'OsherAd', 'osher_ad'],
});
