import mongoose, { Document, Schema } from 'mongoose';

// הגדרות אדמין גלובליות - מסמך יחיד (key='global').
// pushOn*: האם לשלוח לאדמינים התראת פוש על דבר חדש בכל תחום, כל אחד בנפרד.
// feedbackSeenAt: מתי האדמין פתח לאחרונה את מסך המשובים. משוב שנוצר אחרי
// הזמן הזה נספר כ"חדש" במספר שעל האייקון.
export interface IAdminSettings extends Document {
  key: string;
  pushOnSubscription: boolean;
  pushOnFeedback: boolean;
  feedbackSeenAt: Date;
}

const adminSettingsSchema = new Schema<IAdminSettings>(
  {
    key: { type: String, required: true, unique: true },
    pushOnSubscription: { type: Boolean, default: true },
    pushOnFeedback: { type: Boolean, default: true },
    feedbackSeenAt: { type: Date, default: () => new Date() },
  },
  { collection: 'admin_settings' },
);

export const AdminSettings = mongoose.model<IAdminSettings>('AdminSettings', adminSettingsSchema);
