import mongoose, { Document, Schema } from 'mongoose';

// טוקן התראות של האפליקציה מהחנות (נייטיב), בנפרד ממנויי Web Push של הדפדפן:
//  • android: טוקן Firebase Cloud Messaging
//  • ios: טוקן APNs של אפל
// כל מכשיר מחזיק טוקן אחד; אותו טוקן שעובר למשתמש אחר (יציאה וכניסה בחשבון
// אחר באותו מכשיר) משויך מחדש, כדי שהתראות לא יגיעו לחשבון הקודם.
export type DevicePlatform = 'ios' | 'android';

export interface IDeviceToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: DevicePlatform;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, maxlength: 4096 },
    platform: { type: String, enum: ['ios', 'android'], required: true },
  },
  { timestamps: true },
);

export const DeviceToken = mongoose.model<IDeviceToken>('DeviceToken', deviceTokenSchema);
