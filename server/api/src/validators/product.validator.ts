import Joi from 'joi';
import { commonSchemas } from './common.validator';

const productUnits = ['יח׳', 'ק״ג', 'גרם', 'ליטר'] as const;
const productCategories = [
  'מוצרי חלב',
  'מאפים',
  'ירקות',
  'פירות',
  'בשר',
  'משקאות',
  'ממתקים',
  'ניקיון',
  'אחר',
] as const;

export const productValidator = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 100 characters',
      'any.required': 'Product name is required',
    }),
    quantity: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Quantity must be at least 1',
    }),
    unit: Joi.string()
      .valid(...productUnits)
      .default('יח׳'),
    category: Joi.string()
      .valid(...productCategories)
      .default('אחר'),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).trim().messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 100 characters',
    }),
    quantity: Joi.number().integer().min(1).messages({
      'number.min': 'Quantity must be at least 1',
    }),
    unit: Joi.string().valid(...productUnits),
    category: Joi.string().valid(...productCategories),
    isPurchased: Joi.boolean(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided',
  }),

  params: Joi.object({
    listId: commonSchemas.objectId.required(),
    productId: commonSchemas.objectId.required(),
  }),

  listParams: Joi.object({
    listId: commonSchemas.objectId.required(),
  }),

  reorder: Joi.object({
    productIds: Joi.array()
      .items(commonSchemas.objectId)
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one product ID is required',
        'any.required': 'Product IDs are required',
      }),
  }),
};

// Type exports
export type ProductUnit = (typeof productUnits)[number];
export type ProductCategory = (typeof productCategories)[number];

export type CreateProductInput = {
  name: string;
  quantity?: number;
  unit?: ProductUnit;
  category?: ProductCategory;
};

export type UpdateProductInput = {
  name?: string;
  quantity?: number;
  unit?: ProductUnit;
  category?: ProductCategory;
  isPurchased?: boolean;
};

export type ReorderProductsInput = {
  productIds: string[];
};
