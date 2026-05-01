import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * שפע ברכת השם — publishedprices.co.il.
 * שם המשתמש המדויק לא ידוע ולכן מנסים מספר מועמדים נפוצים. אם כולם
 * נכשלים, הרשת תופיע ב-UI כ"אין נתונים היום" ולא תיעלם.
 */
export const shefaBirkatHashemAdapter = createPublishedPricesAdapter({
  chainId: 'shefa_birkat_hashem',
  chainName: 'שפע ברכת השם',
  username: [
    'ShefaBirkatHashem',
    'shefa_birkat_hashem',
    'ShefaBirkatHaShem',
    'Shefa_Birkat_Hashem',
    'ShefaBerachatHashem',
    'shefa',
    'Shefa',
    'BirkatHashem',
  ],
});
