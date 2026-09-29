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
 * - ADMIN_EMAIL: Email address that gets isAdmin=true on register/login.
 *   No default - if unset, no account is auto-granted admin (same safe
 *   behaviour as the socket server). Set it explicitly per deployment.
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

  // client IDs נוספים של Google שמותר לקבל מהם ID token (למשל client של
  // iOS/אנדרואיד), מופרדים בפסיקים. בדרך כלל ריק: הפלאגין הנייטיב מבקש את
  // הטוקן בשם ה-client של האתר (GOOGLE_CLIENT_ID), ואז אין צורך בערך כאן.
  GOOGLE_NATIVE_CLIENT_IDS: Joi.string().allow('').default(''),
  // Sign in with Apple: הקהל (aud) המותר בטוקן של אפל. באפליקציית iOS זה
  // ה-Bundle ID. מופרדים בפסיקים אם יתווסף Services ID לכניסה מהאתר.
  APPLE_CLIENT_IDS: Joi.string().default('com.smartbasket.app'),

  // CORS - רשימת origins מופרדת בפסיקים
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // מייל אדמין - החשבון שמקבל isAdmin=true בהרשמה/כניסה. *אין* ברירת מחדל:
  // אם לא מוגדר, אף אחד לא מקבל אדמין אוטומטית (זהה לדפוס של שרת ה-Socket).
  // חייב להיות מוגדר מפורשות בכל דיפלוימנט שרוצה פאנל אדמין.
  ADMIN_EMAIL: Joi.string().email().lowercase().allow('').default(''),

  // ניטור שגיאות Sentry - שולח רק ב-production
  SENTRY_DSN: Joi.string().optional(),

  // Logtail (BetterStack) - שליחת לוגים לענן
  LOGTAIL_TOKEN: Joi.string().optional(),

  // מפתחות VAPID להתראות push - ליצירה: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: Joi.string().optional(),
  VAPID_PRIVATE_KEY: Joi.string().optional(),
  // ה-"subject" של VAPID - כתובת איש קשר שספק ה-push (Google/Apple/Mozilla)
  // יכול לפנות אליה. לא סוד ולא הרשאה - סתם מחרוזת קשר. ברירת המחדל היא
  // *כתובת התמיכה הפומבית של הפרויקט* (אותה אחת שב-HelpModal/EMAIL_SETUP),
  // לא מייל אישי. אפשר לדרוס עם VAPID_EMAIL בסביבה.
  VAPID_EMAIL: Joi.string().pattern(/^mailto:/).default('mailto:smartbasket129@gmail.com'),

  // ===== התראות באפליקציות מהחנות (נייטיב) =====
  // אנדרואיד: Firebase Cloud Messaging. קובץ ה-JSON של Service Account מ-Firebase
  // (Project settings, Service accounts, Generate new private key), כמחרוזת JSON
  // או בקידוד base64. בלעדיו אין התראות באנדרואיד (שאר האפליקציה עובדת).
  FCM_SERVICE_ACCOUNT: Joi.string().allow('').default(''),
  // iOS: APNs ישירות מול אפל. מפתח .p8 מפורטל המפתחים (Keys, Apple Push
  // Notifications service), תוכן הקובץ או base64, עם מזהה המפתח ומזהה הצוות.
  APNS_KEY: Joi.string().allow('').default(''),
  APNS_KEY_ID: Joi.string().allow('').default(''),
  APNS_TEAM_ID: Joi.string().allow('').default(''),
  APNS_BUNDLE_ID: Joi.string().default('com.smartbasket.app'),
  // true רק לבנייה שמותקנת מ-Xcode ישירות. TestFlight וחנות: production.
  APNS_USE_SANDBOX: Joi.boolean().default(false),

  // LocationIQ API key - fallback ל-geocoding כשNominatim נכשל לכתובות בעברית.
  // מסלול חינמי: 5,000 בקשות ביום, ללא כרטיס אשראי. אם חסר - geocoder יורד חזרה למרכז עיר.
  LOCATIONIQ_API_KEY: Joi.string().optional(),

  // שליחת מיילים דרך Gmail API על HTTPS (לא SMTP - Render חוסם פורטי SMTP).
  // ראה email.service.ts + EMAIL_SETUP.md להסבר מלא ותהליך ההקמה.
  // GMAIL_USER = כתובת ה-Gmail השולחת. שלושת האחרים מ-OAuth2 של Google Cloud
  // (scope: gmail.send). אם אחד מהם חסר - שליחת המייל היא no-op שקט.
  GMAIL_USER: Joi.string().email().optional(),
  GMAIL_CLIENT_ID: Joi.string().optional(),
  GMAIL_CLIENT_SECRET: Joi.string().optional(),
  GMAIL_REFRESH_TOKEN: Joi.string().optional(),

  // שליחת מיילים דרך Resend מהדומיין שלנו. כשהמפתח מוגדר הוא קודם ל-Gmail:
  // השולח הוא כתובת בדומיין המאומת (SPF, DKIM), כך שהמיילים לא נופלים לספאם.
  // הדומיין חייב להיות מאומת ב-Resend לפני השימוש, אחרת כל שליחה נדחית.
  RESEND_API_KEY: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().default('noreply@smart-basket.app'),
  // לאן מגיעות תשובות של נמענים, ולאן נשלחים דוחות שגיאה ודיווחים למנהל
  EMAIL_REPLY_TO: Joi.string().email().default('smartbasket129@gmail.com'),
  // מכסת המיילים היומית של המסלול ב-Resend (החינמי: 100). מוצגת בפאנל האדמין,
  // ושליחה לכולם מעליה נחסמת מראש. אחרי שדרוג מעדכנים כאן בלי שינוי קוד.
  EMAIL_DAILY_LIMIT: Joi.number().integer().min(1).default(100),

  // OCR.space API key - "סרוק רשימה מהדף". מסלול חינמי, ללא כרטיס אשראי.
  // אם חסר - ה-endpoint מחזיר שגיאה ברורה במקום לנסות בלי מפתח.
  OCR_API_KEY: Joi.string().optional(),

  // Cloudinary - אחסון תמונות מוצר. ההעלאה עצמה *ישירה* מהדפדפן ל-Cloudinary
  // (בייטי התמונה אף פעם לא עוברים דרך השרת הזה) - הלקוח מבקש חתימה
  // חד-פעמית מ-GET /api/uploads/signature (עם ה-API secret, כאן בלבד),
  // ומשתמש בה כדי להעלות ישירות ל-Cloudinary מהדפדפן. שלושתם סודות
  // אמיתיים - רק במשתני סביבה, אף פעם לא בקליינט. אם אחד מהם חסר,
  // ה-endpoint מחזיר 503 והלקוח נופל לאחסון data-URL במסמך המוצר.
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),

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

  // ===== מנוי Pro =====
  // נרכש רק דרך App Store / Google Play (RevenueCat, למטה). המחיר נקבע בחנות.
  // חודשי Pro במתנה לכל משתמש חדש (0 = כבוי). חל רק על הרשמות חדשות.
  TRIAL_MONTHS: Joi.number().integer().min(0).max(12).default(3),

  // ===== מנוי דרך חנויות האפליקציות (RevenueCat) =====
  // באפליקציה הנייטיב הרכישה עוברת דרך App Store / Google Play, ו-RevenueCat
  // מאמת אותה מולן. REVENUECAT_SECRET_KEY הוא המפתח הסודי (sk_...) מלוח
  // הבקרה של RevenueCat, לשרת בלבד. REVENUECAT_WEBHOOK_AUTH הוא ערך שבוחרים
  // בעצמכם ומגדירים גם בהגדרות ה-webhook ב-RevenueCat (כותרת Authorization).
  // אם המפתח חסר, הרכישה באפליקציה פשוט לא מוצעת.
  REVENUECAT_SECRET_KEY: Joi.string().optional(),
  REVENUECAT_WEBHOOK_AUTH: Joi.string().min(16).optional(),
  REVENUECAT_ENTITLEMENT_ID: Joi.string().default('pro'),
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
  GOOGLE_NATIVE_CLIENT_IDS: string;
  APPLE_CLIENT_IDS: string;
  CORS_ORIGIN: string;
  ADMIN_EMAIL: string;
  SENTRY_DSN?: string;
  LOGTAIL_TOKEN?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL: string;
  FCM_SERVICE_ACCOUNT: string;
  APNS_KEY: string;
  APNS_KEY_ID: string;
  APNS_TEAM_ID: string;
  APNS_BUNDLE_ID: string;
  APNS_USE_SANDBOX: boolean;
  LOCATIONIQ_API_KEY?: string;
  OCR_API_KEY?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  REDIS_URL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL: string;
  AI_DAILY_REQUEST_BUDGET: number;
  GMAIL_USER?: string;
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  EMAIL_DAILY_LIMIT: number;
  TRIAL_MONTHS: number;
  REVENUECAT_SECRET_KEY?: string;
  REVENUECAT_WEBHOOK_AUTH?: string;
  REVENUECAT_ENTITLEMENT_ID: string;
}

export const env = parseEnv();
