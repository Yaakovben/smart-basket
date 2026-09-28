import mongoose, { Schema, Document, Types } from 'mongoose';

export type LoginMethod = 'email' | 'google' | 'app_open';

// מאיפה נפתחה האפליקציה: דפדפן רגיל, אייקון שהוסף למסך הבית (PWA),
// או האפליקציה מהחנות. נשלח מהלקוח בכותרת X-App-Platform. רשומות ישנות בלעדיו.
export const LOGIN_PLATFORMS = ['browser', 'pwa', 'ios', 'android'] as const;
export type LoginPlatform = typeof LOGIN_PLATFORMS[number];

export const parseLoginPlatform = (value: unknown): LoginPlatform | undefined =>
  typeof value === 'string' && (LOGIN_PLATFORMS as readonly string[]).includes(value) ? value as LoginPlatform : undefined;

export interface ILoginActivity extends Document {
  user: Types.ObjectId;
  userName: string;
  userEmail: string;
  loginMethod: LoginMethod;
  platform?: LoginPlatform;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const loginActivitySchema = new Schema<ILoginActivity>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    loginMethod: {
      type: String,
      enum: ['email', 'google', 'app_open'],
      required: true,
    },
    platform: {
      type: String,
      enum: LOGIN_PLATFORMS,
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// אינדקס מורכב: שאילתות לפי משתמש ממוינות לפי תאריך (מכסה aggregation ו-pagination)
loginActivitySchema.index({ user: 1, createdAt: -1 });

// אינדקס TTL: מחיקה אוטומטית מעל 90 יום + מיון לפי תאריך (pagination, getStatsSince)
loginActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const LoginActivity = mongoose.model<ILoginActivity>(
  'LoginActivity',
  loginActivitySchema
);
