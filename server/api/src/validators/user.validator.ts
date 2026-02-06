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

// Type exports
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
