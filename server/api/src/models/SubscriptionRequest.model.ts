import mongoose, { Document, Schema } from 'mongoose';

// בקשת מנוי Pro בתשלום ידני (ביט/PayBox/העברה) - אין סליקת אשראי, אז כל תשלום
// עובר דרך בקשה שהאדמין מאשר אחרי שראה את ההעברה בפועל.
//   pending  - נוצרה, המשתמש עוד לא דיווח ששילם
//   reported - המשתמש דיווח ששילם, ממתין לאישור אדמין
//   approved - אושרה, המנוי הוארך
//   rejected - נדחתה (לא נמצאה העברה / סכום שגוי)
//   cancelled- בוטלה ע"י המשתמש
export type SubscriptionRequestStatus = 'pending' | 'reported' | 'approved' | 'rejected' | 'cancelled';
export type SubscriptionPayMethod = 'bit' | 'paybox' | 'bank';

export interface ISubscriptionRequest extends Document {
  userId: mongoose.Types.ObjectId;
  months: number;
  amount: number;
  currency: string;
  method: SubscriptionPayMethod;
  // קוד קצר להצגה למשתמש ולציון בהערת ההעברה, כדי שהאדמין יזהה במהירות.
  reference: string;
  status: SubscriptionRequestStatus;
  reportedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionRequestSchema = new Schema<ISubscriptionRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    months: { type: Number, required: true, min: 1, max: 24 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'ILS' },
    method: { type: String, enum: ['bit', 'paybox', 'bank'], required: true },
    reference: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'reported', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    reportedAt: { type: Date },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    adminNote: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

export const SubscriptionRequest = mongoose.model<ISubscriptionRequest>('SubscriptionRequest', subscriptionRequestSchema);
