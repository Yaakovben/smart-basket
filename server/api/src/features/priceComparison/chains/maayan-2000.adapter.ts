import { createPublishedPricesAdapter } from './publishedPrices.factory';

/**
 * מעיין 2000 — publishedprices.co.il.
 * שם המשתמש המדויק לא ידוע ולכן מנסים מספר מועמדים נפוצים בסדר עד שאחד
 * מצליח. אם כולם נכשלים, הרשת תופיע ב-UI כ"אין נתונים היום" ולא תיעלם.
 *
 * אם תגלה את ה-username הנכון בעתיד - השאר אותו ראשון ברשימה.
 */
export const maayan2000Adapter = createPublishedPricesAdapter({
  chainId: 'maayan_2000',
  chainName: 'מעיין 2000',
  username: [
    'Maayan2000',
    'maayan2000',
    'Maayan_2000',
    'MaayanLtd',
    'Mayan2000',
    'maayan',
    'Maayan',
  ],
});
