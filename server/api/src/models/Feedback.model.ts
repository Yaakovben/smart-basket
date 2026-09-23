import mongoose, { Document, Schema } from 'mongoose';

// משוב משתמשים - פופאפ חד-פעמי שקופץ אחרי כמה פתיחות אפליקציה (ראו
// useFeedbackPopup.ts בקליינט). דירוג + טקסט חופשי, נשמר ב-DB כדי שהאדמין
// יוכל לראות את כל המשובים במקום אחד (לא רק מייל בודד שקל לפספס).
export interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  rating: number;
  message?: string;
  createdAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, maxlength: 2000, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
