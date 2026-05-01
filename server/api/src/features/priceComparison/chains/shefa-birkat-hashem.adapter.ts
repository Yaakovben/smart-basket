import { createBinaAdapter } from './bina.factory';

/**
 * שפע ברכת השם - פורטל binaprojects.com (לא publishedprices.co.il).
 * Subdomain: shefabirkathashem.binaprojects.com, ChainId רשמי: 7290058134977.
 */
export const shefaBirkatHashemAdapter = createBinaAdapter({
  chainId: 'shefa_birkat_hashem',
  chainName: 'שפע ברכת השם',
  urlPrefix: 'shefabirkathashem',
  binaChainId: '7290058134977',
});
