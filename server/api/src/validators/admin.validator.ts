import Joi from 'joi';

export const adminValidator = {
  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(500).default(50),
  }),
};
