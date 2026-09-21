// חילוץ נתונים משמות קבצי פורטל Bina. לוגיקה טהורה, בקובץ נפרד כדי שאפשר לבדוק.

// חתימת התאריך בשם הקובץ. הפורטל פירסם בעבר yyyymmddhhmm (12 ספרות רצופות) ועכשיו
// yyyymmdd-hhmmss (מופרד במקף), למשל PriceFull7290058159628-000-065-20260921-045427.GZ.
// תומכים בשניהם. התאריך חייב להיות תקין (שנה 19xx/20xx, חודש, יום): אחרת מספר הרשת
// בן 13 הספרות בשם קובץ בלי חתימה (למשל Stores7290058159628.xml) נתפס בטעות כחתימה.
const STAMP_PATTERN = /((?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))-?(\d{4,6})\.(?:gz|xml)$/i;
const STORE_PATTERN = /-(\d+)-(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])-?\d{4,6}\.(?:gz|xml)$/i;

// מחלץ את חתימת התאריך משם-קובץ, כמחרוזת ספרות להשוואה לקסיקוגרפית בתוך אותו פורמט.
export function extractDateStamp(filename: string): string {
  const m = filename.match(STAMP_PATTERN);
  return m ? m[1] + m[2] : '';
}

// מחלץ את storeId משם-קובץ: המקטע המספרי שמיד לפני חתימת התאריך.
// PriceFull{chainId}-{subChain}-{storeId}-{stamp}.gz או PriceFull{chainId}-{storeId}-{stamp}.gz
export function extractStoreIdFromName(filename: string): string {
  const m = filename.match(STORE_PATTERN);
  return m ? m[1] : '';
}
