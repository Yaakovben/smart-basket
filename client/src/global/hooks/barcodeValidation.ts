// בדיקת ספרת ביקורת של ברקוד מוצר (EAN-13, UPC-A). פענוח ממצלמה יכול לטעות
// בספרה בודדת כשהתמונה מטושטשת; ספרת הביקורת תופסת כמעט כל טעות כזו, ואז
// פשוט ממשיכים לסרוק במקום לחפש מוצר לא נכון.
// 8 ספרות לא נבדקות: EAN-8 ו-UPC-E באותו אורך ומחושבים אחרת. קודים פנימיים של
// רשתות (Code 128, אורכים אחרים) מתקבלים כמו שהם.
export function isValidProductBarcode(code: string): boolean {
  if (!/^\d+$/.test(code)) return false;
  if (code.length !== 13 && code.length !== 12) return true;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  // משקלים 3,1 מימין לשמאל (ללא ספרת הביקורת)
  let sum = 0;
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += digits[i] * w;
  return (10 - (sum % 10)) % 10 === check;
}
