import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
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

// הגדרת transports - קונסול תמיד, Logtail אם מוגדר
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(
      // צבעים בפיתוח בלבד
      env.NODE_ENV !== 'production' ? colorize() : winston.format.uncolorize(),
      logFormat
    ),
  }),
];

// Logtail - שליחת לוגים לענן (betterstack.com)
if (env.LOGTAIL_TOKEN) {
  const logtail = new Logtail(env.LOGTAIL_TOKEN);
  transports.push(new LogtailTransport(logtail));
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'socket' },
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports,
  // לא לצאת מהתהליך בשגיאות
  exitOnError: false,
});
