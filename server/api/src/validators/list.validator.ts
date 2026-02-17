import Joi from 'joi';
import { commonSchemas } from './common.validator';

export const listValidator = {
  create: Joi.object({
    name: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'List name must be at least 2 characters',
      'string.max': 'List name cannot exceed 50 characters',
      'any.required': 'List name is required',
    }),
    icon: Joi.string().optional(),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .default('#14B8A6')
      .messages({
        'string.pattern.base': 'Color must be a valid hex color (e.g., #14B8A6)',
      }),
    isGroup: Joi.boolean().default(false),
    password: Joi.string().length(4).optional().messages({
      'string.length': 'Password must be exactly 4 characters',
    }),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(50).trim().messages({
      'string.min': 'List name must be at least 2 characters',
      'string.max': 'List name cannot exceed 50 characters',
    }),
    icon: Joi.string(),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .messages({
        'string.pattern.base': 'Color must be a valid hex color',
      }),
    password: Joi.string().length(4).allow(null).messages({
      'string.length': 'Password must be exactly 4 characters',
    }),
  }).min(1).messages({
    'object.min': 'At least one field must be provided',
  }),

  params: Joi.object({
    id: commonSchemas.objectId.required(),
  }),

  join: Joi.object({
    inviteCode: Joi.string().min(1).required().messages({
      'string.min': 'Invite code is required',
      'any.required': 'Invite code is required',
    }),
    password: Joi.string().length(4).optional(),
  }),

  memberParams: Joi.object({
    id: commonSchemas.objectId.required(),
    memberId: commonSchemas.objectId.required(),
  }),

};

// Type exports
export type CreateListInput = {
  name: string;
  icon?: string;
  color?: string;
  isGroup?: boolean;
  password?: string;
};

export type UpdateListInput = {
  name?: string;
  icon?: string;
  color?: string;
  password?: string | null;
};

export type JoinGroupInput = {
  inviteCode: string;
  password?: string;
};
