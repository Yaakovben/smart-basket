import Joi from 'joi';
import { commonSchemas } from './common.validator';
import { PRODUCT_UNITS, PRODUCT_CATEGORIES, DEFAULT_UNIT, DEFAULT_CATEGORY } from '../constants';

// תמונת מוצר: או כתובת https חיצונית (Cloudinary וכו') או data URL של
// תמונה דחוסה כשאין אחסון חיצוני מוגדר. כל דבר אחר נדחה - חוסם הזרקת
// javascript:/data:text ל-src של <img> בלקוח. 500KB תואם ל-maxlength
// של השדה במודל.
const IMAGE_MAX = 500000;
const productImageSchema = Joi.string()
  .allow('')
  .max(IMAGE_MAX)
  .custom((value: string, helpers) => {
    if (value === '') return value;
    if (/^https:\/\/\S+$/i.test(value)) return value;
    if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
    return helpers.error('any.invalid');
  }, 'product image')
  .messages({
    'any.invalid': 'Invalid image - must be an https URL or an image data URL',
    'string.max': 'Image is too large',
  });

export const productValidator = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 100 characters',
      'any.required': 'Product name is required',
    }),
    quantity: Joi.number().integer().min(1).max(99999).default(1).messages({
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 99999',
    }),
    unit: Joi.string()
      .valid(...PRODUCT_UNITS)
      .default(DEFAULT_UNIT),
    category: Joi.string()
      .valid(...PRODUCT_CATEGORIES)
      .default(DEFAULT_CATEGORY),
    note: Joi.string().allow('').max(200).messages({
      'string.max': 'Note cannot exceed 200 characters',
    }),
    image: productImageSchema,
    // מזהה זמני מהלקוח (idempotency) - ראה product.service.ts:addProduct
    clientId: Joi.string().max(100).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).trim().messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name cannot exceed 100 characters',
    }),
    quantity: Joi.number().integer().min(1).max(99999).messages({
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 99999',
    }),
    unit: Joi.string().valid(...PRODUCT_UNITS),
    category: Joi.string().valid(...PRODUCT_CATEGORIES),
    isPurchased: Joi.boolean(),
    note: Joi.string().allow('').max(200).messages({
      'string.max': 'Note cannot exceed 200 characters',
    }),
    image: productImageSchema,
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

  move: Joi.object({
    productIds: Joi.array()
      .items(commonSchemas.objectId)
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one product ID is required',
        'any.required': 'Product IDs are required',
      }),
    targetListId: commonSchemas.objectId.required(),
  }),
};

// ייבוא טיפוסים מהקבועים
import type { ProductUnit, ProductCategory } from '../constants';

export type CreateProductInput = {
  name: string;
  quantity?: number;
  unit?: ProductUnit;
  category?: ProductCategory;
  note?: string;
  image?: string;
  clientId?: string;
};

export type UpdateProductInput = {
  name?: string;
  quantity?: number;
  unit?: ProductUnit;
  category?: ProductCategory;
  isPurchased?: boolean;
  note?: string;
  image?: string;
};

export type ReorderProductsInput = {
  productIds: string[];
};

export type MoveProductsInput = {
  productIds: string[];
  targetListId: string;
};
