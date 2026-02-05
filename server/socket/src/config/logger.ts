import winston from 'winston';
import { env } from './environment';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}${metaStr}`;
  }
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    // Console transport with colors in development
    new winston.transports.Console({
      format: combine(
        env.NODE_ENV !== 'production' ? colorize() : winston.format.uncolorize(),
        logFormat
      ),
    }),
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false,
});
