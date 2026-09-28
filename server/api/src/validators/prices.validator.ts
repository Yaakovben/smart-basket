import Joi from 'joi';
import { commonSchemas } from './common.validator';

// ברקוד: ספרות בלבד. קצר מ-EAN מותר, כי יש רשתות עם קודים פנימיים (מוצרי משקל)
const barcode = Joi.string().trim().pattern(/^\d{1,20}$/).messages({
  'string.pattern.base': 'Invalid barcode',
});

const chainId = Joi.string().trim().pattern(/^[a-z0-9_]{2,40}$/).messages({
  'string.pattern.base': 'Invalid chain id',
});

const MAX_BASKET_ITEMS = 200;
const MAX_BASKET_BRANCHES = 50;

export const pricesValidator = {
  chainParams: Joi.object({ chainId: chainId.required() }),

  chainBranchesQuery: Joi.object({
    subChain: Joi.string().trim().max(60),
  }),

  branchProductParams: Joi.object({
    branchId: commonSchemas.objectId.required(),
    barcode: barcode.required(),
  }),

  productParams: Joi.object({ barcode: barcode.required() }),

  // מבצעי מועדון לקוחות לא מופעלים כברירת מחדל: לא כל משתמש חבר מועדון
  clubQuery: Joi.object({
    includeClubPromos: Joi.boolean().default(false),
  }),

  compareBasket: Joi.object({
    items: Joi.array().min(1).max(MAX_BASKET_ITEMS).required().items(Joi.object({
      barcode: barcode.required(),
      quantity: Joi.number().positive().max(1000).default(1),
    })),
    branchIds: Joi.array().min(1).max(MAX_BASKET_BRANCHES).unique().required().items(commonSchemas.objectId),
    includeClubPromos: Joi.boolean().default(false),
  }),

  syncLogsQuery: Joi.object({
    chainId,
    limit: Joi.number().integer().min(1).max(500).default(100),
  }),
};

export interface CompareBasketInput {
  items: Array<{ barcode: string; quantity: number }>;
  branchIds: string[];
  includeClubPromos: boolean;
}
