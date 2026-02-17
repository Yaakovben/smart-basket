import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import { AppError } from '../errors';
import { env, logger } from '../config';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack });

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

  // דיווח שגיאות 500 ל-Sentry
  if (statusCode >= 500 && env.SENTRY_DSN) {
    Sentry.captureException(err);
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
