import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  REDIS_URL: process.env.REDIS_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // API_URL is used by Socket server to call the API for persisting notifications
  // When a product event occurs, Socket broadcasts real-time AND saves to MongoDB via API
  API_URL: process.env.API_URL || 'http://localhost:5000/api',
};

// Validate required env vars
if (!env.JWT_ACCESS_SECRET) {
  console.error('JWT_ACCESS_SECRET is required');
  process.exit(1);
}
