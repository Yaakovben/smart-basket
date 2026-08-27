import Joi from 'joi';
import { commonSchemas } from './common.validator';

export const userValidator = {
  updateProfile: Joi.object({
    name: commonSchemas.name,
    email: commonSchemas.email,
    avatarColor: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .messages({
        'string.pattern.base': 'Avatar color must be a valid hex color',
      }),
    avatarEmoji: Joi.string().allow('').max(10),
  }).min(1).messages({
    'object.min': 'At least one field must be provided',
  }),

  toggleMuteGroup: Joi.object({
    groupId: commonSchemas.objectId.required(),
  }),

  updateListOrder: Joi.object({
    listOrder: Joi.array().items(commonSchemas.objectId).required(),
  }),

  updateSavedLists: Joi.object({
    savedLists: Joi.array()
      .max(20)
      .items(
        Joi.object({
          id: Joi.string().trim().min(1).max(64).required(),
          emoji: Joi.string().allow('').max(16).default('📋'),
          name: Joi.string().trim().min(1).max(40).required(),
          items: Joi.array()
            .max(80)
            .items(
              Joi.object({
                name: Joi.string().trim().min(1).max(60).required(),
                quantity: Joi.number().min(0).max(9999).default(1),
                unit: Joi.string().allow('').max(16).default('יח׳'),
                category: Joi.string().allow('').max(32).default('אחר'),
              })
            )
            .default([]),
        })
      )
      .required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().min(1).required().messages({
      'string.min': 'Current password is required',
      'any.required': 'Current password is required',
    }),
    newPassword: commonSchemas.password.required(),
  }),

  params: Joi.object({
    id: commonSchemas.objectId.required(),
  }),
};

// ייצוא טיפוסים
export type UpdateProfileInput = {
  name?: string;
  email?: string;
  avatarColor?: string;
  avatarEmoji?: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type SavedListItemInput = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

export type SavedListInput = {
  id: string;
  emoji: string;
  name: string;
  items: SavedListItemInput[];
};

export type UpdateSavedListsInput = {
  savedLists: SavedListInput[];
};
