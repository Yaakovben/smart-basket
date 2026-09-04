import Joi from 'joi';

export const uploadValidator = {
  productImage: Joi.object({
    // "data:image/jpeg;base64,..." - התמונה כבר דחוסה בצד לקוח. נדחה מוקדם
    // עם הודעה ברורה אם גדול מדי, במקום ליפול על מגבלת ה-body הגלובלית.
    image: Joi.string()
      .pattern(/^data:image\/(jpeg|jpg|png|webp);base64,/)
      .max(6_000_000)
      .required()
      .messages({
        'string.pattern.base': 'Image must be a base64 data URL (jpeg/png/webp)',
        'string.max': 'Image is too large',
        'any.required': 'Image is required',
      }),
  }),
};

export interface UploadProductImageInput {
  image: string;
}
