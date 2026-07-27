/**
 * ocr.service.ts
 *
 * OCR לתמונת פתק/רשימה ("סרוק רשימה מהדף") - דרך OCR.space (free tier,
 * ocr.space/ocrapi/freekey). פונקציה בודדת ומבודדת בכוונה: אם יתברר
 * שהספק הזה לא מספיק טוב (בעיקר לכתב יד עברי), החלפה לספק אחר היא שינוי
 * של הקובץ הזה בלבד - שום קוד אחר לא תלוי ב-OCR.space ספציפית.
 *
 * OCREngine=3 + language=auto נבחרו אחרי בדיקה אמפירית: engine 2 (ברירת
 * המחדל, מכסה חינמית גדולה יותר - 25,000/חודש) לא זיהה עברית בכלל
 * (פלט זבל). engine 3 (2,500/חודש בלבד בחינם, אבל "highest accuracy" לפי
 * תיעוד OCR.space) קרא טקסט עברי מודפס באופן מושלם בבדיקה. איכות על
 * כתב יד אמיתי עדיין לא ודאית.
 */

import axios from 'axios';
import { logger } from '../config/logger';
import { env } from '../config/environment';
import { AppError } from '../errors';

const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

interface OcrSpaceResponse {
  ParsedResults?: Array<{ ParsedText?: string }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[] | string;
}

export async function scanListImage(base64Image: string): Promise<string> {
  if (!env.OCR_API_KEY) {
    throw new AppError('OCR is not configured on this server', 503, 'OCR_NOT_CONFIGURED');
  }

  const params = new URLSearchParams({
    apikey: env.OCR_API_KEY,
    base64Image,
    language: 'auto',
    OCREngine: '3',
    scale: 'true',
    isOverlayRequired: 'false',
  });

  let data: OcrSpaceResponse;
  try {
    const res = await axios.post<OcrSpaceResponse>(OCR_SPACE_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30_000,
    });
    data = res.data;
  } catch (err) {
    logger.warn('OCR.space request failed:', err);
    throw new AppError('OCR request failed', 502, 'OCR_REQUEST_FAILED');
  }

  const parsedText = data.ParsedResults?.[0]?.ParsedText;
  if (data.IsErroredOnProcessing || !parsedText) {
    const message = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : data.ErrorMessage;
    logger.warn(`OCR.space could not parse image: ${message || 'no text found'}`);
    throw new AppError('Could not read text from this image', 422, 'OCR_NO_TEXT');
  }

  return parsedText;
}
