import mongoose, { Schema, Document, Types } from 'mongoose';

export type LoginMethod = 'email' | 'google' | 'app_open';

export interface ILoginActivity extends Document {
  user: Types.ObjectId;
  userName: string;
  userEmail: string;
  loginMethod: LoginMethod;
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
