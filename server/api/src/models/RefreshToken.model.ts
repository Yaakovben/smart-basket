import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  token: string;
  user: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  // grace period ל-rotation: כשמרעננים, שומרים את הטוקן היוצא כאן לזמן קצר.
  // מאפשר replay של אותו טוקן (למשל תשובת רענון שאבדה ברשת) לקבל את הזוג
  // הנוכחי במקום 401 - ראה token.service.ts:refreshAccessToken.
  previousToken?: string;
  previousTokenGraceUntil?: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    previousToken: {
      type: String,
    },
    previousTokenGraceUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

// מחיקה אוטומטית של טוקנים שפג תוקפם
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1 });
// חיפוש replay של טוקן שהוחלף לאחרונה (grace period)
refreshTokenSchema.index({ previousToken: 1 });

export const RefreshToken = mongoose.model<IRefreshToken>(
  'RefreshToken',
  refreshTokenSchema
);
