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

  // ניקוי שדות רגישים מגוף הבקשה לפני לוג
  const sanitizeBody = (body: Record<string, unknown> | undefined) => {
    if (!body || typeof body !== 'object') return body;
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'refreshToken', 'token'];
    const cleaned = { ...body };
    for (const field of sensitiveFields) {
      if (field in cleaned) cleaned[field] = '[REDACTED]';
    }
    return cleaned;
  };

  // לוג מפורט לכל שגיאה עם כל פרטי הבקשה
  const userId = (req as unknown as { user?: { userId?: string } }).user?.userId;
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

  // דיווח כל השגיאות ל-Sentry עם הקשר מלא
  if (env.SENTRY_DSN) {
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
      scope.setLevel(statusCode >= 500 ? 'error' : 'warning');
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
