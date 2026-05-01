import { createBinaAdapter } from './bina.factory';

/**
 * סופר ספיר - פורטל binaprojects.com (לא publishedprices.co.il).
 * Subdomain: supersapir.binaprojects.com, ChainId רשמי: 7290058156016.
 */
export const superSapirAdapter = createBinaAdapter({
  chainId: 'super_sapir',
  chainName: 'סופר ספיר',
  urlPrefix: 'supersapir',
  binaChainId: '7290058156016',
});
