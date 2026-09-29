import mongoose, { Document, Schema } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  // סוג המכשיר לפי ה-User-Agent בזמן ההרשמה (ברשומות ישנות חסר עד הפתיחה הבאה)
  device?: 'ios' | 'android' | 'desktop';
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    device: {
      type: String,
      enum: ['ios', 'android', 'desktop'],
    },
  },
  {
    timestamps: true,
  }
);

// אינדקס לשאילתות יעילות
pushSubscriptionSchema.index({ userId: 1, endpoint: 1 });

export const PushSubscription = mongoose.model<IPushSubscription>('PushSubscription', pushSubscriptionSchema);
