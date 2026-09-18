import type { RefObject } from 'react';
import { uploadsApi } from '../../../services/api';

export interface PendingImageUpload {
  promise: Promise<string | null>;
  localValue: string;
}

// מעדכן ref של "העלאת תמונה ברקע ממתינה" (Add/Edit - ראו ProductImageField.
// onUploadStart). אם כבר היה שם ערך קודם שטרם נוצל - המשתמש הסיר את
// התמונה ובחר אחרת, או החליף תמונה, לפני שהראשונה נשמרה בפועל במוצר -
// מבטלים אותו קודם. בלי זה, ברגע שה-ref נדרס בערך החדש, אף קוד כבר לא
// מחזיק הפניה להעלאה הקודמת כדי לנקות אותה, והיא נשארת יתומה ב-Cloudinary
// לצמיתות (זה הבאג: "מוסיף תמונה ואז מוריד/מחליף - היא נשארת בענן").
export function setPendingImageUpload(
  ref: RefObject<PendingImageUpload | null>,
  promise: Promise<string | null>,
  localValue: string,
): void {
  const prev = ref.current;
  ref.current = { promise, localValue };
  if (prev) {
    prev.promise.then((url) => {
      if (url) void uploadsApi.discardImage(url);
    }).catch(() => { /* best-effort */ });
  }
}
