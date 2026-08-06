import Joi from 'joi';

export const aiAssistantValidator = {
  chat: Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('user', 'assistant').required(),
          content: Joi.string().trim().min(1).max(1000).required(),
        })
      )
      .min(1)
      .max(20)
      .required(),
  }),
};
