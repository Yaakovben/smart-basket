import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';
import type { NotificationType } from '../types';

// Member subdocument interface
export interface IMember {
  user: Types.ObjectId;
  isAdmin: boolean;
  joinedAt: Date;
}

// Notification subdocument interface (legacy - kept for backward compatibility)
export interface INotification {
  _id: Types.ObjectId;
  type: NotificationType;
  userId: Types.ObjectId;
  userName: string;
  timestamp: Date;
  read: boolean;
}

// List document interface
export interface IList extends Document {
  _id: Types.ObjectId;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: Types.ObjectId;
  members: IMember[];
  inviteCode?: string;
  password?: string;
  notifications: INotification[];
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

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ['join', 'leave', 'removed'],
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: {
      transform: (_, ret) => {
        const { _id, ...rest } = ret;
        return { ...rest, id: _id.toString() };
      },
    },
  }
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
    },
    password: {
      type: String,
      // Password is hashed with bcrypt (input is 4 chars, stored hash is ~60 chars)
    },
    notifications: [notificationSchema],
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

// Indexes (inviteCode index created by unique: true in schema)
listSchema.index({ owner: 1 });
listSchema.index({ 'members.user': 1 });

// Hash password before saving (only if password is modified and is a short plaintext password)
listSchema.pre('save', async function (next) {
  // Skip if password not modified or doesn't exist
  if (!this.isModified('password') || !this.password) return next();

  // Only hash if it looks like a plaintext password (4 chars)
  // Already hashed passwords start with $2b$ and are ~60 chars
  if (this.password.length <= 10 && !this.password.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// Compare password method
listSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return true; // No password set = no protection
  return bcrypt.compare(candidatePassword, this.password);
};

export const List = mongoose.model<IList>('List', listSchema);
