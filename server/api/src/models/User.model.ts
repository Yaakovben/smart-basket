import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  avatarColor: string;
  avatarEmoji: string;
  googleId?: string;
  isAdmin: boolean;
  mutedGroupIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      minlength: [4, 'Password must be at least 4 characters'],
      select: false,
    },
    avatarColor: {
      type: String,
      default: '#14B8A6',
    },
    avatarEmoji: {
      type: String,
      default: '',
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    mutedGroupIds: [{
      type: Schema.Types.ObjectId,
      ref: 'List',
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        const { _id, __v, password, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Note: email and googleId indexes are created by unique: true in schema definition

export const User = mongoose.model<IUser>('User', userSchema);
