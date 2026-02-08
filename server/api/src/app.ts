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

const app = express();

// Trust proxy (required for Render, Railway, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - supports multiple origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or if wildcard is used
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'X-Request-Time'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize data against NoSQL injection
app.use(mongoSanitize());

// Compression
app.use(compression());

// HTTP Request logging
// Format: "POST /api/auth/login 200 45ms"
morgan.token('body-size', (req) => {
  const size = req.headers['content-length'];
  return size ? `${size}b` : '-';
});
app.use(morgan(':method :url :status :response-time ms :body-size', { stream: morganStream }));

// Rate limiting for API routes
app.use('/api', apiLimiter);

// Prevent caching of API responses (fixes mobile browser caching issues)
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Health check
app.get('/health', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const status = dbConnected ? 'ok' : 'degraded';
  res.status(dbConnected ? 200 : 503).json({ status, db: dbConnected, timestamp: new Date().toISOString() });
});

// Swagger API Documentation (only in development)
if (env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SmartBasket API Docs',
  }));
  app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
}

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
