import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * סופר ספיר — publishedprices.co.il.
 * שם המשתמש המדויק לא ידוע ולכן מנסים מספר מועמדים נפוצים. אם כולם
 * נכשלים, הרשת תופיע ב-UI כ"אין נתונים היום" ולא תיעלם.
 */
export const superSapirAdapter = createPublishedPricesAdapter({
  chainId: 'super_sapir',
  chainName: 'סופר ספיר',
  username: [
    'SuperSapir',
    'super_sapir',
    'Super_Sapir',
    'sapir',
    'Sapir',
    'supersapir',
  ],
});
