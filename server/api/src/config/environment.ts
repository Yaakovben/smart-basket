import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

/**
 * API Server Environment Variables
 * ================================
 *
 * Required:
 * - NODE_ENV: Application environment (development/production/test)
 * - PORT: Server port number
 * - MONGODB_URI: MongoDB connection string (e.g., mongodb+srv://...@cluster.mongodb.net/dbname)
 * - JWT_ACCESS_SECRET: Secret key for signing access tokens (min 32 chars)
 * - JWT_REFRESH_SECRET: Secret key for signing refresh tokens (min 32 chars)
 * - GOOGLE_CLIENT_ID: Google OAuth Client ID for authentication
 *
 * Optional:
 * - JWT_ACCESS_EXPIRES_IN: Access token expiry (default: 15m)
 * - JWT_REFRESH_EXPIRES_IN: Refresh token expiry (default: 30d)
 * - CORS_ORIGIN: Allowed origins for CORS, comma-separated (default: http://localhost:5173)
 * - ADMIN_EMAIL: Default admin user email
 * - SENTRY_DSN: Sentry error monitoring DSN (only sends errors in production)
 * - OCR_API_KEY: OCR.space API key for "scan list photo" feature (free tier,
 *   register at ocr.space/ocrapi/freekey). Feature silently no-ops if absent.
 */
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  PORT: Joi.number().default(5000),

  MONGODB_URI: Joi.string().required().messages({
    'any.required': 'MongoDB URI is required',
  }),

  // מפתחות JWT לחתימת טוקנים
  JWT_ACCESS_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT access secret must be at least 32 characters',
    'any.required': 'JWT access secret is required',
  }),
  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT refresh secret must be at least 32 characters',
    'any.required': 'JWT refresh secret is required',
  }),

  // זמני תפוגה - access ארוך כדי להפחית התנתקויות במכשירי מובייל
  // (iOS Safari ITP יכול למחוק localStorage; refresh token לא תמיד עובר)
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('90d'),

  // אימות Google
  GOOGLE_CLIENT_ID: Joi.string().required().messages({
    'any.required': 'Google Client ID is required',
  }),

  // CORS - רשימת origins מופרדת בפסיקים
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // מייל אדמין
  ADMIN_EMAIL: Joi.string().email().default('yaakovbenyizchak1@gmail.com'),

  // ניטור שגיאות Sentry - שולח רק ב-production
  SENTRY_DSN: Joi.string().optional(),

  // Logtail (BetterStack) - שליחת לוגים לענן
  LOGTAIL_TOKEN: Joi.string().optional(),

  // מפתחות VAPID להתראות push - ליצירה: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: Joi.string().optional(),
  VAPID_PRIVATE_KEY: Joi.string().optional(),
  VAPID_EMAIL: Joi.string().pattern(/^mailto:/).default('mailto:yaakovbenyizchak1@gmail.com'),

  // LocationIQ API key - fallback ל-geocoding כשNominatim נכשל לכתובות בעברית.
  // מסלול חינמי: 5,000 בקשות ביום, ללא כרטיס אשראי. אם חסר - geocoder יורד חזרה למרכז עיר.
  LOCATIONIQ_API_KEY: Joi.string().optional(),

  // שליחת מיילים דרך Gmail SMTP ישירות (nodemailer). ראה email.service.ts
  // להסבר מלא למה זה עוקף ספאם (SPF/DKIM/DMARC עוברים כי גוגל שולח בעצמו).
  // הגדרה: אימות דו-שלבי + "App password" ב-Google Account → Security.
  // GMAIL_USER = כתובת ה-Gmail המלאה, GMAIL_APP_PASSWORD = סיסמת האפליקציה
  // (16 תווים, בלי רווחים). אם חסרים - שליחת המייל היא no-op שקט.
  GMAIL_USER: Joi.string().email().optional(),
  GMAIL_APP_PASSWORD: Joi.string().optional(),

  // OCR.space API key - "סרוק רשימה מהדף". מסלול חינמי, ללא כרטיס אשראי.
  // אם חסר - ה-endpoint מחזיר שגיאה ברורה במקום לנסות בלי מפתח.
  OCR_API_KEY: Joi.string().optional(),

  // Redis - אופציונלי. אם מוגדר, שרת ה-API מפרסם אירועי ניתוק/הוצאה בזמן
  // אמת (משתמש נמחק, חבר הוסר מקבוצה) לשרת ה-Socket. אם חסר - הפעולות
  // עדיין מצליחות ב-DB, פשוט בלי אפקט מיידי על sockets פעילים.
  REDIS_URL: Joi.string().optional(),

  // Groq (console.groq.com) - endpoint תואם OpenAI, לעוזר ה-AI לניתוח הוצאות.
  // הוחלף מ-NVIDIA NIM: אותה איכות מודל (Llama 3.3 70B) אבל רץ על חומרת LPU
  // ייעודית של Groq - מהיר משמעותית (~320 טוקן/שנייה), בלי תפוגת קרדיטים
  // ובלי בעיית deprecation פתאומית של מודלים שהייתה ב-NIM. אם המפתח חסר -
  // ה-endpoint מחזיר שגיאה ברורה במקום לנסות בלי מפתח. המפתח הוא סוד אמיתי -
  // רק במשתני סביבה בשרת, אף פעם לא בקוד/בקליינט.
  GROQ_API_KEY: Joi.string().optional(),
  GROQ_MODEL: Joi.string().default('openai/gpt-oss-120b'),
  // תקציב יומי גלובלי לקריאות AI חיצוניות (לכל האפליקציה יחד, לא פר-משתמש).
  // המכסה החינמית של Groq/NIM משותפת - aiAssistantLimiter חוסם פר-משתמש אבל
  // לא את הסכום הכולל. כשמגיעים לתקציב, העוזר מגיש תשובת fallback מקומית עם
  // הודעה ברורה במקום להמשיך לירות בקשות שנכשלות. כדאי לכוון לפי המכסה
  // האמיתית של הספק (ראו remainingTokens/remainingRequests בפאנל האדמין),
  // עם מרווח ביטחון. 0 = בלי תקרה.
  AI_DAILY_REQUEST_BUDGET: Joi.number().integer().min(0).default(2000),
  // NVIDIA NIM (build.nvidia.com) - ספק גיבוי לעוזר ה-AI, לא ראשי. Groq הוא
  // הראשי (מהיר יותר), אבל לטייר החינמי שלו יש מכסה יומית/דקתית - אם היא
  // נגמרת (429) או ש-Groq לא זמין רגעית, השירות עובר אוטומטית ל-NIM כדי
  // שהעוזר ימשיך לעבוד במקום להחזיר שגיאה למשתמש. אופציונלי לגמרי - אם
  // המפתח חסר, פשוט אין גיבוי (Groq בלבד).
  NVIDIA_NIM_API_KEY: Joi.string().optional(),
  NVIDIA_NIM_MODEL: Joi.string().default('meta/llama-3.3-70b-instruct'),
}).unknown(true); // מאפשר משתני סביבה נוספים

const parseEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    console.error('Invalid environment variables:');
    error.details.forEach((detail) => {
      console.error(`  - ${detail.path.join('.')}: ${detail.message}`);
    });
    process.exit(1);
  }

  return value as Environment;
};

export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGODB_URI: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  GOOGLE_CLIENT_ID: string;
  CORS_ORIGIN: string;
  ADMIN_EMAIL: string;
  SENTRY_DSN?: string;
  LOGTAIL_TOKEN?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL: string;
  LOCATIONIQ_API_KEY?: string;
  OCR_API_KEY?: string;
  REDIS_URL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL: string;
  AI_DAILY_REQUEST_BUDGET: number;
  NVIDIA_NIM_API_KEY?: string;
  NVIDIA_NIM_MODEL: string;
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
}

export const env = parseEnv();
