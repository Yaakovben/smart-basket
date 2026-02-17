import winston from 'winston';
import { env } from './environment';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// פורמט לוג מותאם
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  if (stack) {
    return `${timestamp} [${level}]: ${message}\n${stack}${metaStr}`;
  }
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        // צבעים בפיתוח בלבד
        env.NODE_ENV !== 'production' ? colorize() : winston.format.uncolorize(),
        logFormat
      ),
    }),
  ],
  // לא לצאת מהתהליך בשגיאות
  exitOnError: false,
});

// stream ל-morgan
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
