import Joi from 'joi';

// Common schemas used across multiple validators
export const commonSchemas = {
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Invalid ID format'),

  email: Joi.string().email().lowercase().trim().messages({
    'string.email': 'Invalid email format',
  }),

  password: Joi.string().min(8).max(100).messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password cannot exceed 100 characters',
  }),

  name: Joi.string().min(2).max(50).trim().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters',
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};