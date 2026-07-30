import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * נטו — publishedprices.co.il, סיסמה ריקה.
 * ה-username המדויק בפורטל לא ידוע מראש - כמה מועמדים כדי לא ליפול
 * לכשל אימות שקט (אותה בעיה שתוקנה ב-osher-ad).
 */
export const nettoAdapter = createPublishedPricesAdapter({
  chainId: 'netto',
  chainName: 'נטו',
  username: ['Netto', 'netto', 'NETTO'],
});
