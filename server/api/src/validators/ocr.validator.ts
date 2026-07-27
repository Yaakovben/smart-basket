import Joi from 'joi';

export const ocrValidator = {
  scanList: Joi.object({
    // "data:image/jpeg;base64,..." - נדחה מוקדם עם הודעה ברורה אם גדול
    // מדי, במקום ליפול על מגבלת ה-body הגלובלית (10MB) עם שגיאה גנרית.
    image: Joi.string()
      .pattern(/^data:image\/(jpeg|jpg|png);base64,/)
      .max(8_000_000)
      .required()
      .messages({
        'string.pattern.base': 'Image must be a base64 data URL (jpeg/png)',
        'string.max': 'Image is too large',
        'any.required': 'Image is required',
      }),
  }),
};

export interface ScanListInput {
  image: string;
}
