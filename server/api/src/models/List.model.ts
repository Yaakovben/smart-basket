import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

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

// תומך גם בסיסמאות bcrypt ישנות וגם בטקסט פשוט חדש
listSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return true; // אין סיסמה = אין הגנה

  // ישן: סיסמאות מוצפנות מתחילות ב-$2b$
  if (this.password.startsWith('$2b$')) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // חדש: השוואה פשוטה
  return this.password === candidatePassword;
};

export const List = mongoose.model<IList>('List', listSchema);
