import Joi from 'joi';
import { commonSchemas } from './common.validator';

export const authValidator = {
  register: Joi.object({
    name: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
  }),

  checkEmail: Joi.object({
    email: commonSchemas.email.required(),
  }),

  googleAuth: Joi.object({
    accessToken: Joi.string().min(1).required().messages({
      'string.min': 'Access token is required',
      'any.required': 'Access token is required',
    }),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().min(1).required().messages({
      'string.min': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
  }),
};

// Type exports
export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type CheckEmailInput = {
  email: string;
};

export type GoogleAuthInput = {
  accessToken: string;
};

export type RefreshTokenInput = {
  refreshToken: string;
};
