import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export interface IMember {
  user: Types.ObjectId;
  isAdmin: boolean;
  joinedAt: Date;
}


export interface IList extends Document {
  _id: Types.ObjectId;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: Types.ObjectId;
  members: IMember[];
  inviteCode?: string;
  password?: string; // סיסמת קבוצה - 4 תווים בטקסט פשוט
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const memberSchema = new Schema<IMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const listSchema = new Schema<IList>(
  {
    name: {
      type: String,
      required: [true, 'List name is required'],
      trim: true,
      minlength: [2, 'List name must be at least 2 characters'],
      maxlength: [50, 'List name cannot exceed 50 characters'],
    },
    icon: {
      type: String,
      default: '🛒',
    },
    color: {
      type: String,
      default: '#14B8A6',
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    inviteCode: {
      type: String,
      sparse: true,
      unique: true,
      minlength: 6,
      maxlength: 6,
    },
    password: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, password, ...rest } = ret;
        return { ...rest, id: _id.toString(), hasPassword: !!password };
      },
    },
  }
);

// אינדקסים (inviteCode נוצר ע"י unique: true)
listSchema.index({ owner: 1, isGroup: 1 });
listSchema.index({ 'members.user': 1 });
listSchema.index({ owner: 1, updatedAt: -1 });
listSchema.index({ 'members.user': 1, updatedAt: -1 });

// סיסמת קבוצה נשמרת בטקסט פשוט בכוונה - זהו קוד גישה משותף שחייב להיות
// ניתן להצגה/שיתוף לכל חברי הקבוצה (transformList מחזיר אותו ב-API,
// ראו list-transform.helper.ts), לא סוד אישי כמו סיסמת חשבון. לכן אי אפשר
// להצפין אותו בהצפנה חד-כיוונית (bcrypt) - זה היה מונע מהאפליקציה להציג
// אותו בחזרה למשתמשים. ה-timing-safe compare למטה מגן על ההשוואה מפני
// timing attack; עדיין נתמכות סיסמאות bcrypt ישנות מגרסה קודמת של הקוד.
listSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return true; // אין סיסמה = אין הגנה

  // ישן: סיסמאות מוצפנות מתחילות ב-$2b$ ובאורך 60 תווים קבוע. בדיקת האורך
  // חשובה כי סיסמת קבוצה תקנית היא 4 תווים בלי הגבלת charset - מישהו
  // שבוחר את הסיסמה "$2b$" (4 תווים, startsWith('$2b$') לבד היה true)
  // היה גורם ל-bcrypt.compare להיכשל על ערך לא-תקין וחוסם הצטרפות לתמיד.
  if (this.password.startsWith('$2b$') && this.password.length === 60) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // חדש: השוואה בזמן קבוע (מונע timing attack על סיסמה קצרה)
  const candidateBuf = Buffer.from(candidatePassword);
  const storedBuf = Buffer.from(this.password);
  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
};

export const List = mongoose.model<IList>('List', listSchema);
