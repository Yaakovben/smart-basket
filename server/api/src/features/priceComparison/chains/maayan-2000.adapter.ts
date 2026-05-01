import { createBinaAdapter } from './bina.factory';

/**
 * מעיין 2000 - פורטל binaprojects.com (לא publishedprices.co.il).
 * Subdomain: maayan2000.binaprojects.com, ChainId רשמי: 7290058159628.
 */
export const maayan2000Adapter = createBinaAdapter({
  chainId: 'maayan_2000',
  chainName: 'מעיין 2000',
  urlPrefix: 'maayan2000',
  binaChainId: '7290058159628',
});
