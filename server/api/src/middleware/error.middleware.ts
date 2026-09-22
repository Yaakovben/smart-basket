import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import { AppError } from '../errors';
import { env, logger } from '../config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // ברירת מחדל
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: { field: string; message: string }[] | undefined;
  let code: string | undefined;

  // AppError וכל תת-המחלקות
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    if (Array.isArray(err.details)) {
      errors = err.details as { field: string; message: string }[];
    }
  }

  // שגיאת ולידציה של Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation error';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // שגיאת מפתח כפול ב-MongoDB
  if (err.name === 'MongoServerError' && (err as { code?: number }).code === 11000) {
    statusCode = 409;
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : 'field';
    message = `${field} already exists`;
  }

  // ObjectId לא תקין
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ניקוי שדות רגישים מגוף הבקשה לפני לוג, וקיצור שדות ארוכים (תמונות
  // כ-data URL יכולות להגיע עד 10MB) - בלעדי זה כל שגיאה על בקשה כזו
  // שולחת את כל הבייטים ללוג ול-Sentry ושורפת מכסה
  const MAX_FIELD_LEN = 300;
  const sanitizeBody = (body: Record<string, unknown> | undefined) => {
    if (!body || typeof body !== 'object') return body;
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'refreshToken', 'token'];
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (sensitiveFields.includes(key)) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > MAX_FIELD_LEN) {
        cleaned[key] = `${value.slice(0, MAX_FIELD_LEN)}...[truncated, ${value.length} chars total]`;
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };

  // לוג מפורט לכל שגיאה עם כל פרטי הבקשה
  const userId = (req as unknown as { user?: { id?: string } }).user?.id;
  logger.error(`[${statusCode}] ${err.name}: ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code,
    userId,
    params: req.params,
    body: sanitizeBody(req.body as Record<string, unknown>),
    stack: err.stack,
    ...(err instanceof AppError && err.details && { details: err.details }),
    ...(errors && { errors }),
  });

  // דיווח ל-Sentry: 5xx (תקלות שרת אמיתיות) תמיד. 4xx (ולידציה, הרשאות,
  // "לא נמצא" וכו') הן חלק נורמלי מתעבורת API רגילה ולא תקלות - שליחתן
  // הייתה שורפת את מכסת Sentry על כל בקשה שגויה של לקוח
  if (env.SENTRY_DSN && statusCode >= 500) {
    Sentry.withScope((scope) => {
      scope.setTag('statusCode', statusCode.toString());
      scope.setTag('errorCode', code || 'UNKNOWN');
      scope.setTag('method', req.method);
      scope.setTag('url', req.originalUrl);
      if (userId) scope.setUser({ id: userId });
      scope.setContext('request', {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        body: sanitizeBody(req.body as Record<string, unknown>),
      });
      if (errors) {
        scope.setContext('validationErrors', { errors });
      }
      // 500 כ-error, 4xx כ-warning
      scope.setLevel('error');
      Sentry.captureException(err);
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(code && { code }),
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
