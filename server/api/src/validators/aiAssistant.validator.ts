import Joi from 'joi';

export const aiAssistantValidator = {
  chat: Joi.object({
    messages: Joi.array()
      .items(
        Joi.object({
          role: Joi.string().valid('user', 'assistant').required(),
          content: Joi.string().trim().min(1).max(2500).required(),
        })
      )
      .min(1)
      .max(20)
      .required(),
    // שפת התגובה הרצויה - נגזרת מהגדרות הלקוח (SettingsContext), לא
    // מזוהה מתוך תוכן ההודעה. אופציונלי - ברירת המחדל בשירות היא 'he'.
    language: Joi.string().valid('he', 'en', 'ru').optional(),
  }),
};
