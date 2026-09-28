// ===== אימות טפסים =====
// אימות קטן בלי ספרייה: zod שימש רק לשני הטפסים האלה, ולבד הוסיף כ-150KB
// (לפני דחיסה) לקובץ שנטען בכל פתיחת אפליקציה. ההתנהגות זהה: השגיאה
// הראשונה לפי סדר השדות, והודעה = מפתח תרגום.

// בודק שדה אחד: מחזיר מפתח תרגום של השגיאה הראשונה, או null אם תקין
type FieldCheck = (value: unknown) => string | null;

interface Schema<T> {
  check: (data: Record<string, unknown>) => string | null;
  // טיפוס בלבד, לשימוש ב-Infer
  readonly _type?: T;
}

const objectSchema = <T>(fields: Record<keyof T & string, FieldCheck>): Schema<T> => ({
  check: (data) => {
    for (const key of Object.keys(fields) as (keyof T & string)[]) {
      const error = fields[key](data[key]);
      if (error) return error;
    }
    return null;
  },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const emailCheck: FieldCheck = (v) => {
  if (typeof v !== 'string' || v.length < 1) return 'enterEmail';
  return EMAIL_RE.test(v) ? null : 'invalidEmail';
};

const passwordCheck: FieldCheck = (v) =>
  typeof v === 'string' && v.length >= 8 ? null : 'passwordTooShort';

const nameCheck: FieldCheck = (v) => {
  if (typeof v !== 'string' || v.length < 1) return 'enterName';
  return v.length >= 2 ? null : 'nameTooShort';
};

const productNameCheck: FieldCheck = (v) => {
  if (typeof v !== 'string' || v.length < 1) return 'enterProductName';
  return v.length >= 2 ? null : 'productNameTooShort';
};

const quantityCheck: FieldCheck = (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 1 ? null : 'quantityMin';

const stringCheck: FieldCheck = (v) => (typeof v === 'string' ? null : 'invalidInput');

// ===== סכמות =====
export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}

export interface NewProductFormData {
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export const registerSchema = objectSchema<RegisterFormData>({
  name: nameCheck,
  email: emailCheck,
  password: passwordCheck,
});

export const newProductSchema = objectSchema<NewProductFormData>({
  name: productNameCheck,
  quantity: quantityCheck,
  unit: stringCheck,
  category: stringCheck,
});

// ===== עזר ולידציה =====
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validateForm<T>(schema: Schema<T>, data: unknown): ValidationResult<T> {
  const record = (data ?? {}) as Record<string, unknown>;
  const error = schema.check(record);
  return error ? { success: false, error } : { success: true, data: record as T };
}
