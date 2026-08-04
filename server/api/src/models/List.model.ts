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

// הצפנת סיסמת קבוצה לפני שמירה - בלי זה כל דליפת DB/גיבוי הייתה חושפת את
// כל סיסמאות ההצטרפות בטקסט גלוי (ה-timing-safe compare למטה מגן רק על
// ההשוואה, לא על האחסון עצמו).
listSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  if (this.password.startsWith('$2b$')) return next(); // כבר מגובב (ישן)

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// תומך גם בסיסמאות bcrypt ישנות וגם בטקסט פשוט ישן (מלפני התיקון)
listSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return true; // אין סיסמה = אין הגנה

  // ישן: סיסמאות מוצפנות מתחילות ב-$2b$
  if (this.password.startsWith('$2b$')) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // חדש: השוואה בזמן קבוע (מונע timing attack על סיסמה קצרה)
  const candidateBuf = Buffer.from(candidatePassword);
  const storedBuf = Buffer.from(this.password);
  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
};

export const List = mongoose.model<IList>('List', listSchema);
