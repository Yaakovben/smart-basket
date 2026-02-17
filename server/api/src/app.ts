import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import mongoose from 'mongoose';
import routes from './routes';
import { errorHandler, notFoundHandler, apiLimiter } from './middleware';
import { env, morganStream, swaggerSpec } from './config';
import { ForbiddenError } from './errors';

const app = express();

// פרוקסי מהימן (נדרש ל-Render, Railway וכו')
app.set('trust proxy', 1);

app.use(helmet());

// הגדרת CORS - תמיכה במספר origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // אפשר בקשות ללא origin (אפליקציות מובייל, Postman וכו')
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new ForbiddenError('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'X-Request-Time'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// הגנה מ-NoSQL injection
app.use(mongoSanitize());

app.use(compression());

// פורמט לוג: "POST /api/auth/login 200 45ms"
morgan.token('body-size', (req) => {
  const size = req.headers['content-length'];
  return size ? `${size}b` : '-';
});
app.use(morgan(':method :url :status :response-time ms :body-size', { stream: morganStream }));

app.use('/api', apiLimiter);

// מניעת cache בתגובות API (פותר בעיות cache בדפדפני מובייל)
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

app.get('/health', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const status = dbConnected ? 'ok' : 'degraded';
  res.status(dbConnected ? 200 : 503).json({ status, db: dbConnected, timestamp: new Date().toISOString() });
});

// תיעוד API (בסביבת פיתוח בלבד)
if (env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SmartBasket API Docs',
  }));
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
}

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
