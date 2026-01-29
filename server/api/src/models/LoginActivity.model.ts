import mongoose, { Schema, Document, Types } from 'mongoose';

export type LoginMethod = 'email' | 'google';

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
      enum: ['email', 'google'],
      required: true,
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// Indexes for efficient querying
loginActivitySchema.index({ user: 1 });
loginActivitySchema.index({ createdAt: -1 });
loginActivitySchema.index({ loginMethod: 1 });

export const LoginActivity = mongoose.model<ILoginActivity>(
  'LoginActivity',
  loginActivitySchema
);
