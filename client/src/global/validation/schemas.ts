import { z } from 'zod';

// ===== סכמות אימות =====
export const emailSchema = z
  .string()
  .min(1, 'enterEmail')
  .email('invalidEmail');

export const passwordSchema = z
  .string()
  .min(8, 'passwordTooShort');

export const nameSchema = z
  .string()
  .min(1, 'enterName')
  .min(2, 'nameTooShort');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'enterPassword')
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema
});

// ===== סכמות מוצר =====
export const productNameSchema = z
  .string()
  .min(1, 'enterProductName')
  .min(2, 'productNameTooShort');

export const quantitySchema = z
  .number()
  .min(1, 'quantityMin');

export const newProductSchema = z.object({
  name: productNameSchema,
  quantity: quantitySchema,
  unit: z.string(),
  category: z.string()
});

// ===== סכמות רשימה =====
export const listNameSchema = z
  .string()
  .min(1, 'enterListName')
  .min(2, 'nameTooShort');

export const newListSchema = z.object({
  name: listNameSchema,
  icon: z.string(),
  color: z.string()
});

// ===== סכמת הצטרפות לרשימה =====
export const joinGroupSchema = z.object({
  code: z.string().length(6, 'invalidGroupCode'),
  password: z.string().length(4, 'invalidGroupPassword')
});

// ===== טיפוסים מסכמות =====
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type NewProductFormData = z.infer<typeof newProductSchema>;
export type NewListFormData = z.infer<typeof newListSchema>;
export type JoinGroupFormData = z.infer<typeof joinGroupSchema>;

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
