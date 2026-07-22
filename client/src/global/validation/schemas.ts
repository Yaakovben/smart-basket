import { z } from 'zod';

// ===== סכמות אימות =====
const emailSchema = z
  .string()
  .min(1, 'enterEmail')
  .email('invalidEmail');

const passwordSchema = z
  .string()
  .min(8, 'passwordTooShort');

const nameSchema = z
  .string()
  .min(1, 'enterName')
  .min(2, 'nameTooShort');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema
});

// ===== סכמות מוצר =====
const productNameSchema = z
  .string()
  .min(1, 'enterProductName')
  .min(2, 'productNameTooShort');

const quantitySchema = z
  .number()
  .min(1, 'quantityMin');

export const newProductSchema = z.object({
  name: productNameSchema,
  quantity: quantitySchema,
  unit: z.string(),
  category: z.string()
});

// ===== טיפוסים מסכמות =====
export type RegisterFormData = z.infer<typeof registerSchema>;
export type NewProductFormData = z.infer<typeof newProductSchema>;

// ===== עזר ולידציה =====
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // החזרת השגיאה הראשונה (מפתח תרגום)
  const firstError = result.error.issues[0];
  return { success: false, error: firstError.message };
}
